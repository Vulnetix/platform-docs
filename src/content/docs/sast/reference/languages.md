---
title: Supported languages
nav: Languages
description: The language keys SAST rules declare, the file extensions and names that mark a language present, and how the language pre-filter decides which rules compile.
order: 2
sources: [cli/internal/sast/language_filter.go, cli/internal/sast/input.go, cli/internal/sast/engine.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

Every rule lists the languages it targets in `metadata.languages`. Before compiling, the engine looks at the file names in the scan and drops each rule whose languages are all known and all absent. It never reads a file's contents to decide this. Rule counts per language are on the [rules index](/sast/rules/), where you can also filter by language.

## Language keys

Aliases fold onto one key, so a rule that says `node` and a rule that says `typescript` both run on a `.ts` file.

| Key | Aliases | Name |
|---|---|---|
| `javascript` | `node`, `typescript`, `js`, `ts` | JavaScript and TypeScript, including Vue, Svelte, Astro and CoffeeScript |
| `python` | | Python, including Starlark and Cython |
| `java` | | Java, JSP and templates, Groovy and Gradle, and other JVM languages (Scala, Clojure) |
| `kotlin` | | Kotlin |
| `android` | | Android (Kotlin, AIDL, Smali, `AndroidManifest.xml`) |
| `go` | `golang` | Go and Go templates |
| `c` | | C, Objective-C (`.m`), CMake |
| `cpp` | `c++`, `objective-c` | C++, CUDA, Objective-C++ |
| `csharp` | `c#`, `dotnet` | C#, VB.NET, F#, Razor, ASP.NET, project files |
| `php` | | PHP, Blade, Twig, Latte |
| `ruby` | | Ruby, ERB, Haml, Slim, Rake, gemspec |
| `rust` | | Rust |
| `swift` | | Swift |
| `terraform` | | Terraform, OpenTofu, HCL, Packer, Nomad, Sentinel |
| `docker` | | Dockerfile and Containerfile |
| `bash` | `shell`, `sh` | sh, bash, zsh, ksh, fish, Makefiles |
| `html` | | HTML and server-side template languages, AsciiDoc, reStructuredText |
| `sql` | | SQL dialects, Cypher |
| `graphql` | | GraphQL schemas and queries, Prisma |

A rule that declares no `languages`, an empty list, `generic`, `all` or `any`, or only keys not in this table (the built-in rules use `xml`, `yaml`, `config`, `properties`, `kubernetes`, `perl`, `powershell` and `scala` this way), is always compiled. Every secret rule is in this group.

## What marks a language present

A language counts as present when any scanned file has one of its extensions (matched as a suffix, so `.d.ts` and `.blade.php` work), or one of its file names.

| Key | Extensions |
|---|---|
| `javascript` | `.js` `.jsx` `.mjs` `.cjs` `.ts` `.tsx` `.cts` `.mts` `.d.ts` `.vue` `.svelte` `.astro` `.mdx` `.es6` `.es` `.mjml` `.coffee` `.litcoffee` `.iced` `.ls` `.civet` `.gjs` `.gts` `.flow` `.marko` `.riot` `.cjsx` |
| `python` | `.py` `.pyi` `.pyw` `.pyx` `.pxd` `.pxi` `.ipynb` `.rpy` `.pyt` `.pyde` `.sage` `.spyx` `.cython` `.pyp` `.kv` `.pyf` `.bzl` `.star` `.starlark` `.wsgi` `.tac` |
| `java` | `.java` `.jav` `.jsh` `.jsp` `.jspx` `.jspf` `.tag` `.tagx` `.tld` `.jstl` `.ftl` `.ftlh` `.ftlx` `.vm` `.gsp` `.jte` `.aj` `.bsh` `.gradle` `.groovy` `.gvy` `.gy` `.gsh` `.jrxml` `.jasper` `.g4` `.st` `.stg` `.scala` `.sc` `.sbt` `.clj` `.cljs` `.cljc` `.edn` |
| `kotlin` | `.kt` `.kts` `.ktm` `.gradle.kts` |
| `android` | `.kt` `.kts` `.aidl` `.smali` `.rsh` `.axml` |
| `go` | `.go` `.templ` `.gohtml` `.gotmpl` `.gotxt` `.tpl` |
| `c` | `.c` `.h` `.i` `.cats` `.ec` `.pgc` `.upc` `.inc` `.m` `.cmake` |
| `cpp` | `.cpp` `.cc` `.cxx` `.c++` `.cp` `.hpp` `.hh` `.hxx` `.h++` `.hp` `.h` `.ipp` `.tpp` `.txx` `.inl` `.ino` `.cu` `.cuh` `.mm` `.cppm` `.ixx` `.tcc` `.inc` `.m` `.pch` `.cmake` |
| `csharp` | `.cs` `.csx` `.cshtml` `.razor` `.vb` `.fs` `.fsx` `.fsi` `.il` `.aspx` `.ascx` `.ashx` `.asmx` `.asax` `.master` `.xaml` `.axaml` `.cake` `.t4` `.tt` `.vbhtml` `.resx` `.resw` `.asp` `.asa` `.dib` `.csproj` `.sln` `.slnx` `.vbproj` `.fsproj` `.nuspec` |
| `php` | `.php` `.php3` to `.php8` `.phtml` `.phtm` `.phps` `.phpt` `.pht` `.ctp` `.inc` `.module` `.install` `.theme` `.engine` `.profile` `.blade.php` `.latte` `.twig` `.volt` `.tpl` |
| `ruby` | `.rb` `.rbw` `.rbi` `.rbs` `.rake` `.gemspec` `.ru` `.erb` `.rhtml` `.haml` `.slim` `.jbuilder` `.builder` `.rabl` `.thor` `.podspec` `.arb` `.opal` `.god` `.axlsx` `.watchr` |
| `rust` | `.rs` `.rs.in` |
| `swift` | `.swift` `.swiftinterface` `.gyb` `.docc` `.xcconfig` |
| `terraform` | `.tf` `.tfvars` `.hcl` `.tf.json` `.tfvars.json` `.nomad` `.pkr.hcl` `.sentinel` `.tofu` |
| `docker` | `.dockerfile` `.docker` `.containerfile`, and any file name containing `dockerfile` or `containerfile` |
| `bash` | `.sh` `.bash` `.zsh` `.ksh` `.ash` `.dash` `.mksh` `.pdksh` `.csh` `.tcsh` `.fish` `.bats` `.command` `.ebuild` `.eclass` `.zshrc` `.bashrc` `.nu` `.elv` `.mk` `.make` |
| `html` | `.html` `.htm` `.xhtml` `.shtml` `.pug` `.jade` `.mustache` `.hbs` `.handlebars` `.ejs` `.erb` `.njk` `.liquid` `.twig` `.mako` `.jinja` `.jinja2` `.j2` `.heex` `.eex` `.gohtml` `.cshtml` `.ftl` `.adoc` `.asciidoc` `.rst` `.markdown` and other template extensions |
| `sql` | `.sql` `.ddl` `.dml` `.psql` `.pgsql` `.plsql` `.tsql` `.mysql` `.hql` `.cql` `.sqlite` `.prql` `.cypher` `.gql` and other dialect extensions |
| `graphql` | `.graphql` `.gql` `.gqls` `.graphqls` `.sdl` `.prisma` |

File names also mark a language, matched case-insensitively. They include the package manifests and lockfiles (`package.json`, `yarn.lock`, `deno.json` for `javascript`; `go.mod`, `go.work` for `go`; `pom.xml`, `build.gradle`, `build.sbt` for `java`; `build.gradle.kts` for `kotlin`; `Cargo.toml` for `rust`; `composer.json` for `php`; `pyproject.toml`, `requirements.txt`, `uv.lock` for `python`; `Gemfile` for `ruby`; `Package.swift`, `Podfile` for `swift`; `nuget.config`, `global.json` for `csharp`), build files (`AndroidManifest.xml` for `android`, `CMakeLists.txt` and `meson.build` for `c` and `cpp`, `Makefile`, `PKGBUILD` for `bash`, `Jenkinsfile` for `java`, `BUILD.bazel` for `python`) and `docker-compose.yml`, `compose.yaml` and `Earthfile` for `docker`. The full table is `languageFilenames` in `internal/sast/language_filter.go`.

Extensions shared by several languages (`.h`, `.inc`, `.m`, `.erb`, `.twig`, `.gql`) mark every claimant present. Over-detecting only compiles a few extra rules; under-detecting would skip rules that should run.

> [!WHY] Why the filter fails open
> A rule that declares a language the filter does not model is kept, not dropped. The filter exists to save compile time, so it may only skip rules it is sure cannot match. Each rule still checks the file extension itself before it reports anything.

## Which files a rule sees

The pre-filter decides which rules compile; it does not decide which files they read. Each rule receives every text file in the scan in `input.file_contents` and checks the path itself, usually by extension. Files the scan never reads cannot be seen by any rule:

- files deeper than `--depth` (default 3, counting the file name);
- files over 1 MiB, binary files and unreadable files;
- `.git` and the always-skipped directories (`node_modules`, `__pycache__`, `.tox`, `.hg` and others);
- paths matched by `.gitignore`, unless `--include-ignored`;
- paths matched by `--exclude`.

See [Flags](/sast/reference/flags/#what-to-scan).
