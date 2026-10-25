"""Current Python output is a differential oracle, alongside independent expectations."""
import json
from pathlib import Path
import subprocess

import pytest

from custom_components.marao_dashboard import generator as g

ROOT = Path(__file__).parents[3]
FIXTURES = ROOT / 'ha-test/upgrade/fixtures'
MANIFEST = json.loads((FIXTURES / 'page-model-expectations.json').read_text())


def browser_compile(source, entities=None, language='en'):
    script = """
import fs from 'node:fs';
import {compileDashboard} from './frontend_src/compile-dashboard.js';
const {source, entities, language} = JSON.parse(fs.readFileSync(0,'utf8'));
process.stdout.write(JSON.stringify(compileDashboard(source, {entities,language,dashboardRoot:'marao-dashboard'})));
"""
    result = subprocess.run(['node', '--input-type=module', '-e', script], input=json.dumps({'source': source, 'entities': entities or [], 'language': language}), capture_output=True, text=True, cwd=ROOT, check=True)
    return json.loads(result.stdout)


def python_compile(source, entities=None, language='en'):
    resolved = g.resolve_dashboard_config(source, entities or [])
    def expand(value):
        if isinstance(value, g.TaggedScalar):
            assert value.value == '/components/navigation/navbar.yaml'
            return g._navigation_bar(resolved, 'marao-dashboard', language)
        if isinstance(value, dict):
            return {key: expand(child) for key, child in value.items()}
        if isinstance(value, list):
            return [expand(child) for child in value]
        return value
    pages = sorted(resolved['pages'], key=lambda page: page['path'] != resolved['landing_page'])
    views = [{**g._page_view(page, '', 'marao-dashboard', language), 'theme': resolved['theme']} for page in pages]
    return {'title': resolved['name'], 'views': expand(views)}


@pytest.mark.parametrize('record', MANIFEST['records'], ids=lambda record: record['input'])
def test_compiler_matches_historical_runtime_contracts(record):
    source = json.loads((FIXTURES / record['input']).read_text())
    before = json.dumps(source)
    assert browser_compile(source) == python_compile(source)
    assert json.dumps(source) == before


@pytest.mark.parametrize('language', ['en', 'pt'])
def test_compiler_preserves_current_realistic_safe_dashboard(language):
    source = json.loads((ROOT / 'ha-test/marao_dashboard_test_dashboard.json').read_text())
    assert browser_compile(source, language=language) == python_compile(source, language=language)


def test_compiler_preserves_complete_safe_gallery():
    script = """
const fs=require('fs'),YAML=require('yaml'),{composeDashboard}=require('./ha-test/prepare');
const gallery=require('./ha-test/cases').expandGallery(YAML.parse(fs.readFileSync('ha-test/dashboard/views/00-card-test.yaml','utf8')));
process.stdout.write(JSON.stringify(composeDashboard(JSON.parse(fs.readFileSync('ha-test/marao_dashboard_test_dashboard.json')),gallery)));
"""
    result = subprocess.run(['node', '-e', script], capture_output=True, text=True, cwd=ROOT, check=True)
    source = json.loads(result.stdout)
    assert browser_compile(source) == python_compile(source)


@pytest.mark.parametrize('entities', [[], [
    {'entity_id':'light.office','name':'Office','has_state':True},
    {'entity_id':'cover.exhaust','name':'Exhaust','has_state':True,'device_class':'damper'},
    {'entity_id':'sensor.power','name':'Power','has_state':True,'device_class':'power'},
    {'entity_id':'sensor.battery','name':'Battery','has_state':True,'device_class':'battery'},
    {'entity_id':'lock.safe','name':'Door','has_state':True},
    {'entity_id':'media_player.tv','name':'TV','has_state':True,'device_model':'Apple TV','manufacturer':'Apple'},
    {'entity_id':'weather.home','name':'Weather','has_state':True},
    {'entity_id':'scene.safe','name':'Scene','has_state':True},
]])
def test_native_template_snapshots_match_current_python(entities):
    from custom_components.marao_dashboard.editor import page_templates
    source = {'config_version':2,'name':'Safe','pages':[{'name':'Office','path':'office','area':'office','entities':['light.office']}]}
    script = """
import fs from 'node:fs';
import {pageTemplates} from './frontend_src/native-metadata.js';
const {source,entities}=JSON.parse(fs.readFileSync(0,'utf8'));
process.stdout.write(JSON.stringify(pageTemplates(source,entities)));
"""
    actual = subprocess.run(['node','--input-type=module','-e',script],input=json.dumps({'source':source,'entities':entities}),capture_output=True,text=True,cwd=ROOT,check=True)
    assert json.loads(actual.stdout) == page_templates(source,entities)
