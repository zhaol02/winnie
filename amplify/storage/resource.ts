import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "winniepro-photos",
  access: (allow) => ({
    "photos/*": [
      allow.authenticated.to(["read", "write", "delete"]),
      allow.guest.to(["read"]),
    ],
  }),
});
