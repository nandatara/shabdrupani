# Deployment Notes

## Current Deployment

Shabdrupāṇi is deployed through GitHub Pages.

Live URL:

```text
https://shabdrupani.gtnmtn.org

GitHub Pages source:

main branch
root folder
Required Files

The root directory must contain:

index.html
CNAME
.nojekyll

The CNAME file must contain exactly:

shabdrupani.gtnmtn.org

No protocol, no slash, no extra path.

Correct:

shabdrupani.gtnmtn.org

Incorrect:

https://shabdrupani.gtnmtn.org
https://nandatara.github.io/shabdrupani/
DNS

The DNS record for the custom domain should be:

Type: CNAME
Host: shabdrupani
Target: nandatara.github.io

This is configured under the domain:

gtnmtn.org

The main Squarespace site remains:

gtnmtn.com

The Squarespace site should link externally to:

https://shabdrupani.gtnmtn.org
Deployment Steps

After changes:

git status
git add .
git commit -m "Describe change"
git push origin main

GitHub Pages will rebuild automatically.

Local Testing

Run:

python -m http.server 8080

Open:

http://localhost:8080

Use hard refresh after data changes:

Ctrl + F5

