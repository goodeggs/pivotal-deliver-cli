# pivotal-deliver-cli

Script to deliver finished [Pivotal Tracker](https://www.pivotaltracker.com) stories in a commit range.

Uses https://github.com/Wizcorp/node-pivotal to connect with the [Pivotal API](https://www.pivotaltracker.com/help/api?version=v3)
(v3, which is old, but sufficient).

Intended to be run with a deployment tool (which is aware of the Git SHA of each build), as a final step after deploying code.

Run with the following set on the environment:

- `PIVOTAL_TOKEN`
- `PIVOTAL_PROJECT_ID`
- `CURRENT_COMMIT` - SHA indicating end of commit range
- `PREVIOUS_COMMIT` - SHA indicating beginning of commit range.

`./node_modules/.bin/pivotal_deliver`

Script will:

1. Parse story IDs from the commit log in the given range.
2. Find corresponding _Finished_ stories in the given Pivotal project.
3. Set those stories to _Delivered_, and add a comment.
4. Report to stdout.

