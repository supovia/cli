# supovia

Command-line access to your customer-support data on
[app.supovia.com](https://app.supovia.com): help-center documents, support
conversations and their messages, customers, and the websites (support
workspaces) they belong to.

## Install

```bash
npm install -g supovia   # global install
npx supovia --help       # or run without installing
```

Requires Node.js 18 or newer.

## Quick start

```bash
supovia login            # opens the browser to authorize the CLI
supovia websites list    # your support workspaces with their ids
supovia conversations list -n 5
```

```
Found 2 website(s):
1. Example Docs (example.com) (64a1f2c9e4b0a1b2c3d4e5f6)
2. Example App (64a1f2c9e4b0a1b2c3d4e5f7)

Found 5 conversation(s):
1. Jane - Hi, how do I invite a teammate?... (64a1f2c9e4b0a1b2c3d4e5f8)
...
```

## A note on customer data

Conversations, messages, and customers are real customer text and identities.
Keep raw exports local, and never paste message bodies, customer emails, phone
numbers, or other identities into public places — issue trackers, commit
messages, documentation, or third-party tools.

## Authentication

`supovia login` starts a temporary localhost server, opens your browser to
app.supovia.com, and receives the session tokens on the redirect back. If the
browser does not open, the login URL is printed so you can visit it by hand.
Tokens are stored in `~/.supovia/`; `supovia logout` clears them. A command
run without a valid session prints "Please login first" and starts the
browser login on its own.

## Commands

Resource groups share the same three read shapes: `list` prints one-line
summaries (newest first, default 10 rows, `-n` to change), `get [id]` prints
the raw record — or the raw array when the id is omitted — and `read <id>`
formats a single record for the terminal.

### Session

```bash
supovia login    # log in via browser; tokens land in ~/.supovia/
supovia logout   # clear the stored session
```

### Websites

```bash
supovia websites list                        # all websites: name, domain, id
supovia websites get <websiteIdOrName>       # raw record for one website
supovia websites read <websiteIdOrName>      # formatted view
supovia websites add --name "Acme" --organizationId <orgId>
supovia websites update <websiteIdOrName...> --domain acme.com
```

`update` accepts one or more website ids or names and any of `--domain`,
`--whitelabelDocsUrl`, `--iframeUrl`, `--defaultLocale`,
`--customerAgentEnabled [true|false]`, and `--customerAgentPrompt`. The same
change is applied to every website named, so double-check the target list.
`add` requires both `--name` and `--organizationId`.

### Documents (help center)

```bash
supovia docs list                            # documents (--websiteId, -l/--locale, -s/--slug)
supovia docs get <idOrSlug>                  # raw record by id or slug (-l for a locale, -n limits lists)
supovia docs read <idOrSlug>                 # formatted article (-l selects a translation)
supovia docs add --title "How to invite teammates" --content "<p>...</p>" --websiteId <id>
```

`-s/--slug` filters by the original slug shared by every translation of an
article. `docs add` creates a live help-center document; run without flags it
prompts interactively for title, content, and website id. Content is stored
as HTML.

### Conversations

```bash
supovia conversations list                   # newest conversations (--websiteId, --customerId, -k/--key, -n)
supovia conversations get <conversationId>   # raw record
supovia conversations read <conversationId>  # full thread with sender labels and timestamps
supovia conversations update <conversationId...> --resolved         # mark resolved
supovia conversations update <conversationId...> --resolved false   # reopen
supovia conversations resolve <conversationId...>                   # shorthand for --resolved
```

`update` and `resolve` accept multiple ids and change shared support state —
resolve only conversations you mean to. There is no delete, and the CLI
cannot send a message to a customer.

### Messages

```bash
supovia messages list                        # newest messages (--websiteId, --conversationId, -k/--key, -n)
supovia messages get <messageId>             # raw record
supovia messages read <messageId>            # formatted message
```

For a whole thread prefer `supovia conversations read` — it orders the
messages and labels the senders.

### Customers

```bash
supovia customers list                       # customers (--websiteId, --email, -n)
supovia customers get <customerId>           # raw record
supovia customers read <customerId>          # formatted profile
```

### Skills

```bash
supovia skills list       # names and descriptions of the bundled agent guides
supovia skills get supovia   # print a bundled SKILL.md to stdout
```

## Configuration

A `supovia.json` in the working directory (or any directory beneath it)
supplies the default `--websiteId`:

```json
{ "websiteId": "64a1f2c9e4b0a1b2c3d4e5f6" }
```

CLI options always override the config file. `SUPOVIA_API_URL` overrides the
API endpoint (default `https://api.supovia.com`) — only needed against a
non-production deployment.

## Usage with AI agents

Install the Supovia agent skills — `supovia` (this CLI) and
`support-operations` (the MCP-based support workflow) — for Claude Code,
Cursor, Codex, and any other agent that supports the Skills standard:

```bash
npx skills add supovia/skills
```

The same guides ship inside the npm package, version-matched to the installed
CLI:

```bash
supovia skills list          # what is bundled
supovia skills get supovia   # the CLI guide matching this version
```

Or paste this into your `AGENTS.md` / `CLAUDE.md`:

```markdown
## Customer support

Use the `supovia` CLI for Supovia customer-support data: help-center
documents, support conversations and messages, customers, and websites. Run
`npx supovia skills get supovia` for the full guide, and `supovia --help` for
the command reference. Log in once with `supovia login`. Conversations and
messages are customer data — never paste message bodies or customer
identities into public contexts.
```

Prefer a connector? The Supovia MCP server at `https://mcp.supovia.com/mcp`
exposes a privacy-bounded support surface as tools for Claude, ChatGPT, and
any MCP-capable host — see
[supovia.com/developers](https://www.supovia.com/developers/).

## License

[Apache-2.0](LICENSE)
