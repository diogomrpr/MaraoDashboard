## Connection and read ownership

The local Home Assistant connection serves saved observations. Device commands require both that transport and a reachable backend. The companion exposes its backend status before cards mount and emits changes independently of Home Assistant state updates. A shared reader and lifecycle listener handle this optional interface. Ordinary Home Assistant pages continue to use their own transport status.

Read owners keep their selected period, folder or forecast tab. They distinguish the companion’s typed coverage miss from a successful empty result and a Home Assistant error. Observations retain their source timestamps. Reconnect refreshes reads and ignores obsolete asynchronous results.

## Linked sections

For section action cards, use the known view and section indices where supplied. A host without a section index can identify its section through the containing view index and matching configuration. Ambiguous or foreign ownership remains an error.
