variable "cloudflare_api_token" {
  description = "Cloudflare API token with DNS edit permission on the vulnetix.com zone."
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for vulnetix.com."
  type        = string
  default     = "d3aeda6727dbbae840f5abb1aab1444d"
}

variable "github_pages_target" {
  description = "GitHub Pages CNAME target for the Vulnetix organisation."
  type        = string
  default     = "vulnetix.github.io"
}

variable "manage_pages" {
  description = "Whether Terraform owns the GitHub Pages block. Imported on 2026-10-27 and again after the rename on 2026-11-01, so true; see pages.tf."
  type        = bool
  default     = true
}

variable "github_token" {
  description = "GitHub token for the integrations/github provider. Required only when manage_pages is true."
  type        = string
  sensitive   = true
  default     = ""
}
variable "manage_docs_certificate" {
  description = "Whether Terraform orders the advanced certificate for the retired two-level docs hosts (certificates.tf). Needs a token with SSL and Certificates: Edit."
  type        = bool
  default     = false
}
