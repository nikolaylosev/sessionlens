# Third-party notices

SessionLens's own code is MIT-licensed (see `LICENSE`). It also bundles other people's open-source
code, unmodified except where noted, inside a few files under `media/`: `vendor-eslint.js` (built for
the Playwright/qa-ts profile), `vendor-eslint-cypress.js` (qa-cypress), `vendor-eslint-detox.js`
(qa-detox — ESLint core only; every Detox *rule* is SessionLens's own, since `eslint-plugin-detox` has
none worth bundling), and `tree-sitter.js` + `tree-sitter.wasm` with three grammars: `tree-sitter-java.wasm`
(qa-java), `tree-sitter-c_sharp.wasm` (qa-c#) and `tree-sitter-python.wasm` (qa-python).
The ESLint bundles are minified; this file is where their copyright and license notices live instead.

## media/vendor-eslint-cypress.js

Built by SessionLens from these packages, unmodified apart from turning off each
eslint-plugin-cypress rule's options schema (`meta.schema = false`) so ESLint never has to compile
an ajv validator at runtime — VS Code's webview CSP blocks the `new Function` call that requires.

- **eslint** 10.11.0 — MIT — Copyright OpenJS Foundation and other contributors, <https://openjsf.org>
- **eslint-plugin-cypress** 7.0.2 — MIT — Copyright Cypress.io <https://github.com/cypress-io/eslint-plugin-cypress>
- **ajv** 6.x — MIT — Copyright (c) 2015-2021 Evgeny Poberezkin (bundled as part of ESLint's rule-schema
  validation; SessionLens's `meta.schema = false` patch means its code-generation path is never reached)
- **uri-js** 4.4.1 — BSD-2-Clause — Copyright (c) 2014 Gary Court (a dependency of ajv)
- **natural-compare** 1.4.0 — MIT — Copyright (c) 2012-2015 Lauri Rooden (a dependency of ESLint)

MIT license text: <https://opensource.org/license/mit>
BSD-2-Clause license text: <https://opensource.org/license/bsd-2-clause>

## media/vendor-eslint-detox.js

Same build recipe (ESLint's `Linter`, same `meta.schema = false` patch), but with no upstream rule
plugin: `eslint-plugin-detox` on npm turned out to have zero real rules (only a Detox globals
declaration), so every Detox rule in this bundle is SessionLens's own hand-authored code. What's
bundled from elsewhere is ESLint core itself and its own transitive dependencies — the identical set
the Cypress bundle above already lists, from the same installed versions:

- **eslint** 10.11.0 — MIT — Copyright OpenJS Foundation and other contributors
- **ajv** 6.15.0 — MIT — Copyright (c) 2015-2021 Evgeny Poberezkin (same `meta.schema = false` situation as above)
- **uri-js** — BSD-2-Clause — Copyright (c) 2014 Gary Court (a dependency of ajv)
- **natural-compare** — MIT — Copyright (c) 2012-2015 Lauri Rooden (a dependency of ESLint)

## media/vendor-eslint.js

Built the same way (ESLint's Linter + eslint-plugin-playwright), predating this notices file. It also
bundles Sucrase, which strips TypeScript types before ESLint reads the code (`transforms: ["typescript"]`).
Identified from the bundle's own code; where the bundle has no version string, the version was found by comparing it
with the published packages:

- **eslint** 10.10.0 (the version string inside the bundle) — MIT — Copyright OpenJS Foundation and other contributors
- **eslint-plugin-playwright** 2.12.0 — MIT — Copyright Mark Skelton (no version string; all 67 rules and all 118 rule
  messages of 2.12.0 are in the bundle, and 2.11.0 and earlier lack rules the bundle has)
- **eslint-scope** — BSD-2-Clause — Copyright (c) jQuery Foundation and other contributors
- **estraverse** — BSD-2-Clause — Copyright (c) 2012-2016 Yusuke Suzuki
- **globals** — MIT — Copyright (c) Sindre Sorhus
- **debug** and **ms** — MIT — Copyright (c) Josh Junon and contributors
- **ajv** 6.x — MIT — Copyright (c) 2015-2021 Evgeny Poberezkin (as in the Cypress bundle above)
- **uri-js** — BSD-2-Clause — Copyright (c) 2014 Gary Court (a dependency of ajv), with **punycode** 2.1.0 inside it —
  MIT — Copyright Mathias Bynens
- **natural-compare** — MIT — Copyright (c) 2012-2015 Lauri Rooden (a dependency of ESLint)
- **sucrase** 3.x — MIT — Copyright (c) 2012-2018 various contributors (no version string; its code is the same in
  3.34.0 to 3.35.1, the latest)
- **ts-interface-checker** 0.1.13 — Apache-2.0 — Copyright Dmitry S, Grist Labs (a dependency of Sucrase; it has no
  NOTICE file). This is the Apache-licensed code this file used to list as "an interface-checking helper".
- **lines-and-columns** 1.2.4 — MIT — Copyright (c) 2015 Brian Donovan (a dependency of Sucrase)

Apache-2.0 license text: <https://www.apache.org/licenses/LICENSE-2.0>

## media/tree-sitter.js, media/tree-sitter.wasm, media/tree-sitter-java.wasm, media/tree-sitter-c_sharp.wasm, media/tree-sitter-python.wasm

Used for the qa-java, qa-c# and qa-python profiles' structural checks (JUnit/TestNG/NUnit/xUnit/MSTest-
attribute and assertion-shape analysis, and their Python/pytest equivalents — see `media/lint-java.js`,
`media/lint-csharp.js` and `media/lint-python.js` for SessionLens's own rules on top of this parser). Unlike
the ESLint bundles above, these files are copied as-is, not built by SessionLens — `tree-sitter.js` and
`tree-sitter.wasm` are the unmodified `web-tree-sitter` npm package's own browser/Node build (shared by all
three grammars — one core runtime, three separate grammar binaries loaded into it), and the three
`tree-sitter-*.wasm` grammar files are unmodified prebuilt binaries redistributed by the `tree-sitter-wasms`
npm package (itself public-domain/Unlicense — its own code is just a build script; the grammar binaries it
redistributes carry the licenses below).

- **web-tree-sitter** 0.20.8 — MIT — Copyright (c) 2018-2021 Max Brunsfeld — <https://github.com/tree-sitter/tree-sitter>
  (pinned to this version specifically because it matches the WASM ABI every grammar below was compiled
  against; a newer `web-tree-sitter` fails to load them — see the Phase 2/3 handoff notes)
- **tree-sitter-java** 0.20.2 — MIT — Copyright (c) 2017 Ayman Nadeem — <https://github.com/tree-sitter/tree-sitter-java>
- **tree-sitter-c-sharp** 0.20.0 — MIT — Copyright (c) 2014 Max Brunsfeld — <https://github.com/tree-sitter/tree-sitter-c-sharp>
- **tree-sitter-python** 0.21.0 — MIT — Copyright (c) 2016 Max Brunsfeld — <https://github.com/tree-sitter/tree-sitter-python>

All three grammar `.wasm` files were obtained prebuilt via `tree-sitter-wasms` rather than compiled
locally, since no emscripten/docker toolchain was available.

MIT license text: <https://opensource.org/license/mit>
BSD-2-Clause license text: <https://opensource.org/license/bsd-2-clause>

## media/vendor-ruff.js, media/ruff.wasm

Ruff, the Python linter, for the qa-python profile and qa-api's `.py` files (0.1.129; see `media/lint-ruff.js` for the
rules SessionLens takes from it). `ruff.wasm` is the unmodified `ruff_wasm_bg.wasm` of the npm package
`@astral-sh/ruff-wasm-web` 0.16.10; `vendor-ruff.js` is its `ruff_wasm.js` wrapped as a classic script by
`scripts/vendor-ruff.js` (the `export`s removed, the default `.wasm` path set), otherwise unchanged.

- **ruff** 0.16.10 — MIT — Copyright (c) 2022 Charles Marsh — <https://github.com/astral-sh/ruff>

The package's LICENSE, with the notices of the libraries Ruff is derived from:

```text
MIT License

Copyright (c) 2022 Charles Marsh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

end of terms and conditions

The externally maintained libraries from which parts of the Software is derived
are:

- autoflake, licensed as follows:
  """
    Copyright (C) 2012-2018 Steven Myint

    Permission is hereby granted, free of charge, to any person obtaining a copy of
    this software and associated documentation files (the "Software"), to deal in
    the Software without restriction, including without limitation the rights to
    use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
    of the Software, and to permit persons to whom the Software is furnished to do
    so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
  """

- autotyping, licensed as follows:
  """
    MIT License

    Copyright (c) 2023 Jelle Zijlstra

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
  """

- Flake8, licensed as follows:
  """
    == Flake8 License (MIT) ==

    Copyright (C) 2011-2013 Tarek Ziade <tarek@ziade.org>
    Copyright (C) 2012-2016 Ian Cordasco <graffatcolmingov@gmail.com>

    Permission is hereby granted, free of charge, to any person obtaining a copy of
    this software and associated documentation files (the "Software"), to deal in
    the Software without restriction, including without limitation the rights to
    use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
    of the Software, and to permit persons to whom the Software is furnished to do
    so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
  """

- flake8-eradicate, licensed as follows:
  """
    MIT License

    Copyright (c) 2018 Nikita Sobolev

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
  """

- flake8-pyi, licensed as follows:
  """
    The MIT License (MIT)

    Copyright (c) 2016 Łukasz Langa

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
  """

- flake8-simplify, licensed as follows:
  """
    MIT License

    Copyright (c) 2020 Martin Thoma

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
  """

- isort, licensed as follows:
  """
    The MIT License (MIT)

    Copyright (c) 2013 Timothy Edmund Crosley

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
  """

- pygrep-hooks, licensed as follows:
  """
    Copyright (c) 2018 Anthony Sottile

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
  """

- pycodestyle, licensed as follows:
  """
    Copyright © 2006-2009 Johann C. Rocholl <johann@rocholl.net>
    Copyright © 2009-2014 Florent Xicluna <florent.xicluna@gmail.com>
    Copyright © 2014-2020 Ian Lee <IanLee1521@gmail.com>

    Licensed under the terms of the Expat License

    Permission is hereby granted, free of charge, to any person
    obtaining a copy of this software and associated documentation files
    (the "Software"), to deal in the Software without restriction,
    including without limitation the rights to use, copy, modify, merge,
    publish, distribute, sublicense, and/or sell copies of the Software,
    and to permit persons to whom the Software is furnished to do so,
    subject to the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
    BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
    ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
    CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
  """

- pydocstyle, licensed as follows:
  """
    Copyright (c) 2012 GreenSteam, <http://greensteam.dk/>

    Copyright (c) 2014-2020 Amir Rachum, <http://amir.rachum.com/>

    Copyright (c) 2020 Sambhav Kothari, <https://github.com/samj1912>

    Permission is hereby granted, free of charge, to any person obtaining a copy of
    this software and associated documentation files (the "Software"), to deal in
    the Software without restriction, including without limitation the rights to
    use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
    of the Software, and to permit persons to whom the Software is furnished to do
    so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
  """

- Pyflakes, licensed as follows:
  """
    Copyright 2005-2011 Divmod, Inc.
    Copyright 2013-2014 Florent Xicluna

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
    LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
    WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  """

- Pyright, licensed as follows:
  """
    MIT License

    Pyright - A static type checker for the Python language
    Copyright (c) Microsoft Corporation. All rights reserved.

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE
  """

- pyupgrade, licensed as follows:
  """
    Copyright (c) 2017 Anthony Sottile

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
  """

- rome/tools, licensed under the MIT license:
  """
    MIT License

    Copyright (c) Rome Tools, Inc. and its affiliates.

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
  """

- RustPython, licensed as follows:
  """
    MIT License

    Copyright (c) 2020 RustPython Team

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
  """

- rust-analyzer/text-size, licensed under the MIT license:
  """
    Permission is hereby granted, free of charge, to any
    person obtaining a copy of this software and associated
    documentation files (the "Software"), to deal in the
    Software without restriction, including without
    limitation the rights to use, copy, modify, merge,
    publish, distribute, sublicense, and/or sell copies of
    the Software, and to permit persons to whom the Software
    is furnished to do so, subject to the following
    conditions:

    The above copyright notice and this permission notice
    shall be included in all copies or substantial portions
    of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
    PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
    SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
    IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
    DEALINGS IN THE SOFTWARE.
  """
```

This file will be extended as further dependencies (a Kotlin grammar, Robot Framework tooling, etc.) are bundled.
