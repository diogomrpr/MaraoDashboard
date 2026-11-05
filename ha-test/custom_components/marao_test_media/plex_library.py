"""Fictional Plex-shaped content; this fixture never contacts a server."""

from urllib.parse import urlsplit, parse_qs

BASE = "plex://marao-fixture/"


def item(key, title, kind, *, expand=False):
    return {"title": title, "media_class": {"server": "directory", "hub": "directory", "library": "directory", "show": "tv_show"}.get(kind, kind), "media_content_id": BASE + key, "media_content_type": kind, "can_play": not expand, "can_expand": expand}


def browse(media_type=None, media_id=None):
    root = item("server", "Fictional Plex library", "server", expand=True)
    recommended = item("server/Recommended", "Recommended", "server", expand=True)
    resume = item("server/home.continue", "Continue Watching", "hub", expand=True)
    recent = item("server/movie.recentlyadded", "Recently Added", "hub", expand=True)
    movies = item("1", "Movies", "library", expand=True)
    shows = item("2", "TV Shows", "library", expand=True)
    show = item("100", "The Observatory", "show", expand=True)
    season = item("101", "Season 1", "season", expand=True)
    episode = item("102", "The Observatory · S1 E2", "episode")
    movie = item("201", "A Journey Through the Clouds", "movie")
    entries = {
        "server": (root, [recommended, movies, shows]),
        "server/Recommended": (recommended, [resume, recent]),
        "server/home.continue": (resume, [{**episode, "media_content_id": BASE + "102?resume=1"}]),
        "server/movie.recentlyadded": (recent, [movie]),
        "1": (movies, [movie]), "2": (shows, [show]), "100": (show, [season]), "101": (season, [episode]),
    }
    if not media_id:
        key = "server"
    else:
        parsed = urlsplit(media_id)
        if parsed.scheme != "plex" or parsed.netloc != "marao-fixture":
            raise ValueError("The fictional fixture accepts only its own library.")
        key = parsed.path.lstrip("/")
    if key not in entries:
        raise ValueError("Fictional folder not found.")
    node, children = entries[key]
    from homeassistant.components.media_player import BrowseMedia
    return {**node, "children": [BrowseMedia(**child) for child in children]}


def playback(media_type, media_id):
    parsed = urlsplit(media_id)
    if parsed.scheme != "plex" or parsed.netloc != "marao-fixture" or parsed.path not in {"/102", "/201"} or media_type not in {"episode", "movie"}:
        raise ValueError("The fictional fixture accepts only its own titles.")
    return ("The Observatory · S1 E2" if parsed.path == "/102" else "A Journey Through the Clouds", 90 if parse_qs(parsed.query).get("resume") == ["1"] else 0)
