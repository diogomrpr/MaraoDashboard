"""Netatmo metadata uses native camera caches without exposing transport secrets."""
from copy import deepcopy
from enum import Enum
from types import SimpleNamespace as NS

import pytest
from custom_components.marao_dashboard import camera_events as api


def test_normalizes_types_order_limit_and_excludes_transport_credentials():
    class Kind(Enum):
        person = 'person'
    source = {
        200: {'event_time': 200, 'event_type': 'outdoor', 'subevents': [{'event_type': 'human'}, {'event_type': 'vehicle'}, {'event_type': 'animal'}], 'message': '<b>Example</b> &amp; animals', 'media_url': 'SECRET_URL', 'person_id': 'PRIVATE_PERSON', 'snapshot': {'url': 'SECRET_IMAGE'}},
        300: {'event_time': 300, 'event_type': Kind.person, 'media_url': 'SECRET_URL'},
        100: {'event_time': 100, 'event_type': 'movement', 'media_url': 'SECRET_URL'},
        400: {'event_time': 400, 'event_type': 'person'},
        'bad': {'event_time': 'bad', 'media_url': 'SECRET_URL'},
    }
    before = deepcopy(source)
    result = api.normalize_netatmo_events(source, 'camera-id', 2)
    assert result == [
        {'id': '300', 'provider': 'netatmo', 'start_time': 300, 'hasThumbnail': False, 'eventTypes': ['person'], 'label': '', 'mediaContentId': 'media-source://netatmo/events/camera-id/300'},
        {'id': '200', 'provider': 'netatmo', 'start_time': 200, 'hasThumbnail': True, 'eventTypes': ['person', 'vehicle', 'animal'], 'label': 'Example & animals', 'mediaContentId': 'media-source://netatmo/events/camera-id/200'},
    ]
    assert 'SECRET' not in str(result) and 'PRIVATE_PERSON' not in str(result)
    assert source == before


@pytest.mark.parametrize('modern', [False, True])
def test_selects_only_the_registered_camera_in_legacy_or_runtime_cache(monkeypatch, modern):
    selected = {10: {'event_time': 10, 'event_type': 'movement', 'media_url': 'private'}}
    cache = {'camera-id': selected, 'other-camera': {20: {'event_time': 20, 'media_url': 'other-private'}}}
    user = NS(permissions=NS(check_entity=lambda entity, policy: entity == 'camera.test'))
    registered = NS(platform='netatmo', config_entry_id='entry')
    monkeypatch.setattr(api.er, 'async_get', lambda hass: NS(async_get=lambda entity: registered))
    hass = NS(states=NS(get=lambda entity: NS(attributes={'id': 'camera-id'})),
              config_entries=NS(async_get_entry=lambda entry: NS(runtime_data=NS(events=cache)) if modern else NS()),
              data={} if modern else {'netatmo': {'netatmo_events': cache}})
    assert [event['id'] for event in api.netatmo_events(hass, user, 'camera.test', 12)] == ['10']
    assert cache['camera-id'] == selected
    hass.states = NS(get=lambda entity: NS(attributes={'id': 'missing'}))
    assert api.netatmo_events(hass, user, 'camera.test', 12) == []


def test_denied_permission_never_reads_registry_state_or_provider_cache(monkeypatch):
    def forbidden(*args):
        pytest.fail('Provider data read before permission check')
    monkeypatch.setattr(api.er, 'async_get', forbidden)
    hass = NS(states=NS(get=forbidden))
    user = NS(permissions=NS(check_entity=lambda entity, policy: False))
    with pytest.raises(PermissionError):
        api.netatmo_events(hass, user, 'camera.private', 12)
    with pytest.raises(ValueError):
        api.netatmo_events(hass, user, 'light.netatmo', 12)


def test_wrong_provider_and_missing_cache_fail_readably(monkeypatch):
    registered = NS(platform='generic', config_entry_id=None)
    monkeypatch.setattr(api.er, 'async_get', lambda hass: NS(async_get=lambda entity: registered))
    hass = NS(states=NS(get=lambda entity: NS(attributes={'id': 'camera-id'})), data={})
    user = NS(permissions=NS(check_entity=lambda entity, policy: True))
    with pytest.raises(ValueError, match='Netatmo camera'):
        api.netatmo_events(hass, user, 'camera.test', 12)
    registered.platform = 'netatmo'
    with pytest.raises(ValueError, match='event data'):
        api.netatmo_events(hass, user, 'camera.test', 12)


async def test_websocket_validates_limits_and_returns_read_permission_errors(hass, hass_ws_client, monkeypatch):
    from custom_components.marao_dashboard import DOMAIN, _register_websocket_commands

    hass.data.setdefault(DOMAIN, {})
    _register_websocket_commands(hass)
    client = await hass_ws_client(hass)
    calls = []

    def read_events(hass, user, entity, limit):
        calls.append((entity, limit))
        if entity == 'camera.denied':
            raise PermissionError('Denied')
        if entity == 'camera.offline':
            raise ValueError('Netatmo event data is unavailable')
        return []

    monkeypatch.setattr(api, 'netatmo_events', read_events)
    for index, entity, limit, code in [(1, 'camera.test', 12, None), (2, 'camera.test', 101, 'invalid_format'),
                                       (3, 'camera.denied', 12, 'unauthorized'), (4, 'camera.offline', 12, 'camera_events_unavailable')]:
        await client.send_json({'id': index, 'type': 'marao_dashboard/camera/netatmo_events', 'entity_id': entity, 'limit': limit})
        result = await client.receive_json()
        if code:
            assert not result['success'] and result['error']['code'] == code
        else:
            assert result['success'] and result['result'] == []
    assert calls == [('camera.test', 12), ('camera.denied', 12), ('camera.offline', 12)]
