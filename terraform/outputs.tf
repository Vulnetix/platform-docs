output "site_url" {
  description = "Public URL of the docs site."
  value       = "https://docs.vulnetix.com/"
}

output "site_record" {
  description = "The managed CNAME, for confirming it matches public/CNAME."
  value = {
    name    = cloudflare_dns_record.docs.name
    type    = cloudflare_dns_record.docs.type
    content = cloudflare_dns_record.docs.content
    proxied = cloudflare_dns_record.docs.proxied
  }
}
