"""Safe inline Lovelace configuration; saved YAML remains the source of truth."""
from __future__ import annotations

import math
from typing import Any

import yaml


class CardLoader(yaml.SafeLoader):
    def get_single_data(self):
        node = self.get_single_node()
        active, checked = set(), set()

        def check(node):
            if id(node) in active:
                raise ValueError("Card YAML must contain finite JSON-compatible values without recursive aliases.")
            if id(node) in checked:
                return
            active.add(id(node))
            children = [child for pair in node.value for child in pair] if isinstance(node, yaml.MappingNode) else node.value if isinstance(node, yaml.SequenceNode) else []
            for child in children:
                check(child)
            active.remove(id(node))
            checked.add(id(node))

        if node is None:
            return None
        # Inspect aliases before merge flattening can erase a recursive reference.
        check(node)
        return self.construct_document(node)

    def flatten_mapping(self, node):
        # SafeConstructor flattens merges before construct_mapping; check explicit keys first.
        if id(node) in getattr(self, "_checked_mappings", set()):
            return
        self._checked_mappings = getattr(self, "_checked_mappings", set()) | {id(node)}
        keys = [self.construct_object(key) for key, _ in node.value if key.tag != 'tag:yaml.org,2002:merge']
        if any(not isinstance(key, str) for key in keys) or len(set(keys)) != len(keys):
            raise ValueError("Card YAML requires unique string keys.")
        super().flatten_mapping(node)


def parse_card_yaml(source: str) -> dict[str, Any]:
    if not isinstance(source, str) or not source.strip():
        raise ValueError("Home Assistant card YAML must be nonempty text.")
    try:
        card = yaml.load(source, Loader=CardLoader)
        active: set[int] = set()
        count = 0

        def check(value):
            nonlocal count
            count += 1
            if count > 100_000:
                raise ValueError("Card YAML is too complex.")
            if value is None or type(value) in (str, bool, int):
                return
            if type(value) is float and math.isfinite(value):
                return
            if type(value) not in (dict, list) or id(value) in active:
                raise ValueError("Card YAML must contain finite JSON-compatible values without recursive aliases.")
            active.add(id(value))
            for child in value.values() if isinstance(value, dict) else value:
                check(child)
            active.remove(id(value))
        check(card)
    except yaml.constructor.ConstructorError as error:
        raise ValueError("Card YAML uses an unsupported tag. Inline the configuration instead of using !include or !secret.") from error
    except (yaml.YAMLError, RecursionError, TypeError) as error:
        raise ValueError("Invalid Home Assistant card YAML.") from error
    if not isinstance(card, dict) or not isinstance(card.get("type"), str) or not card["type"].strip():
        raise ValueError("Card YAML must be an object with a nonempty type.")
    return card
