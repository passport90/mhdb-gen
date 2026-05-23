# `<base href>` must never be empty

Use `<base href="./">` for depth 0 (the root index); deeper pages use `<base href="../">`, `<base href="../../">`, etc. matching their depth. An empty `<base href="">` trips Safari/WebKit URL resolution and mangles relative links like `1066/index.html` to `/1066` — which then 404s on any non-rewriting static server (`http-server`, `python3 -m http.server`). The dumb static server is the correct serving choice; the templates must produce URLs that survive it.
