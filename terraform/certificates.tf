# Edge certificate for the retired two-level docs hostnames.
#
# docs.cli, docs.code, docs.guardrails and docs.mcp sit two labels under
# vulnetix.com, so the zone's universal certificate (*.vulnetix.com) does not
# cover them. While they were GitHub Pages CNAMEs (unproxied) Pages issued their
# certificates. To answer them with the redirect Worker they must be proxied,
# and the edge then needs a certificate of its own: without one the TLS
# handshake fails (seen on docs.code on 2026-11-02 and reverted).
#
# An advanced certificate pack covers exactly these names. Cloudflare validates
# it by TXT records it places itself, since the zone's DNS is on Cloudflare.
# The pack must include the zone apex.
#
# Applying this needs an API token with "SSL and Certificates: Edit" on the
# zone, which the DNS-edit token does not have. Set manage_docs_certificate to
# true with such a token, apply, wait for status "active", then switch each
# host's DNS (see redirects/wrangler.toml and vdb-site var.retired_docs_hosts).
resource "cloudflare_certificate_pack" "retired_docs" {
  count = var.manage_docs_certificate ? 1 : 0

  zone_id               = var.cloudflare_zone_id
  type                  = "advanced"
  certificate_authority = "google"
  validation_method     = "txt"
  validity_days         = 90
  hosts = [
    "vulnetix.com",
    "docs.cli.vulnetix.com",
    "docs.code.vulnetix.com",
    "docs.guardrails.vulnetix.com",
    "docs.mcp.vulnetix.com",
  ]
}
