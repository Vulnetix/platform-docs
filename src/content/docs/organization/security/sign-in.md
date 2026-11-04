---
title: Sign-in and account security
nav: Sign-in
description: Create a Vulnetix account, sign in with a password, GitHub, Google or a passkey, add a passkey or authenticator app, and reset a forgotten password.
order: 0.5
sources: [vulnetix-authentic-aws/blueprints/10-flows.yaml, vulnetix-authentic-aws/blueprints/15-enrollment.yaml, vulnetix-authentic-aws/blueprints/16-passwordless.yaml, vulnetix-authentic-aws/blueprints/17-mfa-config.yaml, vulnetix-authentic-aws/blueprints/18-recovery.yaml, vulnetix-authentic-aws/blueprints/19-login-links.yaml, vulnetix-authentic-aws/blueprints/20-source-github.yaml, vulnetix-authentic-aws/blueprints/21-source-google.yaml, vulnetix-authentic-aws/blueprints/30-policy-good-email.yaml, vdb-site/api/internal/handler/account_mfa.go, vdb-site/api/internal/handler/password_reset.go, website/src/pages/resolve/login.vue, website/src/pages/resolve/register.vue, website/src/pages/resolve/account.vue]
checked: [vulnetix-authentic-aws@f2ec6ee42, vdb-site@d2ea72f23, website@7f3b734cd]
updated: 04 Nov 2026
---

Every person signs in to the console through the Vulnetix sign-in page at `https://auth.vulnetix.com`. This page covers creating an account, the ways to sign in, adding a second factor, and resetting a password. Joining an existing organisation is on [Members and roles](/organization/people/members-and-roles/).

## Ways in

The console's sign-in page (`https://www.vulnetix.com/resolve/login`) offers three buttons:

| Button | What happens |
|---|---|
| **Continue with GitHub** | Signs in, or creates an account, with your GitHub identity |
| **Continue with Google** | Signs in, or creates an account, with your Google identity |
| **Sign in with Vulnetix** | Opens the Vulnetix sign-in page, where you sign in with your email and password, or with a passkey |

Passkeys, two-factor and password recovery are all handled on the Vulnetix sign-in page, not in the console.

## Create an account

Open `https://www.vulnetix.com/resolve/register` and choose **Create your account**, **Continue with GitHub** or **Continue with Google**.

### With an email address

**Create your account** opens the form **Create your Vulnetix account**:

| Field | Required | Notes |
|---|---|---|
| Email address | yes | Becomes your username. It is stored in lower case. |
| Company name | no | The first person to register for an organisation names it with this. |
| Password | yes | |
| Repeat password | yes | Must match. |

1. Submit the form. The account is created inactive.
2. An email titled **Confirm your Vulnetix account** arrives. The link in it is valid for 30 minutes.
3. Open the link. The account is activated and you are signed in. The sign-in page then shows "Email confirmed. Your account is ready."

Until the link is opened, the account cannot sign in.

### With GitHub or Google

The first sign-in with GitHub or Google creates the account. If an account already exists with the same email address, the GitHub or Google identity is linked to it instead of creating a second one.

GitHub sign-up uses the first verified email on your GitHub account that is not a `users.noreply.github.com` address. With no such email, sign-up stops with:

```text
Your GitHub account has no verified public email. Add and verify an email in GitHub, then try again.
```

Add and verify an email address in GitHub, then try again.

## Sign in with a passkey

On the Vulnetix sign-in page, **Use a security key** signs you in with a passkey alone, with no email or password. It works with any passkey or hardware security key you have added to your account (see below). A passkey is stored as a discoverable credential, so the key itself tells the sign-in page who you are.

## Passkeys and authenticator apps

Open **Account › Profile** (`/resolve/account`) and find **Passkeys & two-factor**. It lists the passkeys and authenticator apps registered to your account, with when each was added and last used.

| Button | Adds |
|---|---|
| **Add passkey** | A passkey or hardware security key (WebAuthn), named "Vulnetix Passkey" by default |
| **Add authenticator app** | A time-based one-time password (TOTP) app |

Each opens in a new tab on the Vulnetix sign-in page and requires you to be signed in. When setup finishes you are sent back to your account page, and the list refreshes when you return to the tab.

Adding either one is optional. Sign-up never asks for a second factor.

Remove a device with its delete button. The same list and removal are available over the API (`GET` and `DELETE /v1/account/mfa`); see [Your own account](/organization/people/members-and-roles/#your-own-account). An owner can list and remove another member's devices, for example when someone loses a phone; see [Acting on another member's account](/organization/people/members-and-roles/#acting-on-another-members-account). The events `security.mfa.enrolled`, `security.mfa.removed` and `security.mfa.reset_by_admin` can be routed to a channel; see [Messaging](/organization/integrations/messaging/#events).

## Reset a forgotten password

1. On the Vulnetix sign-in page, choose **Forgot password?**.
2. Enter your email address. The page does not say whether an account exists for it.
3. An email titled **Reset your Vulnetix password** arrives. The link is valid for 30 minutes.
4. Open the link and enter a new password twice.
5. You land on the console sign-in page, which shows "Password updated. Sign in with your new password." Sign in with it.

A reset does not sign you in, and it does not reactivate a deactivated account. A link that is invalid or already used takes you to the sign-in page.

If you are already signed in, change your password from **Account › Profile** instead. A password set there, or by an owner for another member, must be at least 12 characters.

## Sessions

**Account › Profile** lists your active sessions. **Sign out everywhere** ends all of them. Signing out from the console header ends only the session of that browser.
