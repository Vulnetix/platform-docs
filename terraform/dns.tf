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
# The retired docs hostnames (software-factory.vulnetix.com and the old
# per-product docs sites) are not here: each is a proxied placeholder record
# plus a 301 rule in vdb-site/terraform/dns.tf, which is the only owner of the
# zone's redirect ruleset.

resource "cloudflare_dns_record" "docs" {
  zone_id = var.cloudflare_zone_id
  name    = "docs.vulnetix.com" # provider v5 stores the FQDN; a bare label plans a diff on every run
  type    = "CNAME"
  content = var.github_pages_target
  proxied = false # Pages cannot issue its certificate behind the proxy
  ttl     = 300

  comment = "Keep in sync with public/CNAME in Vulnetix/platform-docs."
}
