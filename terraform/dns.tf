# DNS for the Vulnetix docs site.
#
# docs.vulnetix.com -> GitHub Pages.
#
# Must NOT be proxied. GitHub Pages issues its own certificate for the custom
# domain and can only do so when it sees the real CNAME; behind the Cloudflare
# proxy the issuance never completes.
#
# Keep in step with public/CNAME. Pages reads that file to decide which domain
# it serves, and .github/workflows/pages.yml asserts it after every build.
#
# The retired docs hostnames are not here. Each is a proxied placeholder record
# in vdb-site/terraform/dns.tf (var.retired_docs_hosts). software-factory is
# answered by a host-level rule in vdb-site's redirect ruleset; the old product
# docs hosts are answered by the vulnetix-docs-redirects Worker in redirects/,
# which maps every old URL to its page. The two-level ones need the advanced
# certificate in certificates.tf before they can be proxied.

resource "cloudflare_dns_record" "docs" {
  zone_id = var.cloudflare_zone_id
  name    = "docs.vulnetix.com" # provider v5 stores the FQDN; a bare label plans a diff on every run
  type    = "CNAME"
  content = var.github_pages_target
  proxied = false # Pages cannot issue its certificate behind the proxy
  ttl     = 300

  comment = "Keep in sync with public/CNAME in Vulnetix/platform-docs."
}
