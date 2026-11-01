# GitHub Pages configuration for Vulnetix/platform-docs.
#
# Pages was enabled with the GitHub API when the repository was created (as
# Vulnetix/software-factory), so Terraform adopted it by import on 2026-10-27.
# The repository was renamed to platform-docs on 2026-11-01; the resource was
# moved in state and re-imported under the new name:
#
#   terraform state rm 'github_repository_pages.software_factory[0]'
#   terraform import 'github_repository_pages.platform_docs[0]' platform-docs
#
# The provider needs TF_VAR_github_token, an org admin token.

resource "github_repository_pages" "platform_docs" {
  count = var.manage_pages ? 1 : 0

  repository = "platform-docs"

  # .github/workflows/pages.yml deploys with actions/deploy-pages.
  build_type = "workflow"
  cname      = "docs.vulnetix.com"

  # GitHub rejects this until the certificate for the domain is issued. It was
  # issued on 2026-11-01, after the domain was cleared and set again: Pages
  # never requests one for a domain bound before its DNS record exists.
  #
  # Careful: when this provider changed https_enforced alone, GitHub cleared
  # cname and the site went to 404. The fix was `gh api -X PUT
  # repos/Vulnetix/platform-docs/pages -f cname=docs.vulnetix.com` and a
  # redeploy of pages.yml. After any apply that touches this block, check
  # `gh api repos/Vulnetix/platform-docs/pages --jq .cname`.
  https_enforced = true

  lifecycle {
    prevent_destroy = true
  }
}
