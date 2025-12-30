# Notes

Random notes for things learned while coding this project.

## Firebase

### Setup

- Created a Firebase project.
- Added a client - web app to communicate with firebase.
  - Grabbed the firebase config object and added it to my firebase client app.
- Enabled Authentication (Google sign-in).
- Created Firestore (database).
  - Set rules for the collections/documents to be used.
- Managing consistency between apps (if needed)
  - Can have a "revision" attribute on the doc.
    - A rule to check that the revision being sent is the same as what is already saved + 1
    - The client can ensure it stays in sync by querying this revision number
    - This app does not have revision (tried it, didn't want it)
