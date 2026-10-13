import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  Category: a.enum([
    "BATHROOM",
    "KITCHEN",
    "LIVING_ROOM",
    "BEDROOM",
    "EXTERIOR",
    "OTHER",
  ]),

  Project: a
    .model({
      customerName: a.string().required(),
      address: a.string(),
      category: a.ref("Category"),
      description: a.string(),
      photos: a.hasMany("Photo", "projectId"),
      // Denormalized counter — incremented after each successful Photo.create
      // in the upload page to avoid O(n) Photo.list queries in the admin dashboard.
      photoCount: a.integer(),
    })
    .authorization((allow) => [
      allow.authenticated().to(["create", "update", "delete"]),
      allow.guest().to(["read"]),
    ]),

  Photo: a
    .model({
      projectId: a.string().required(),
      s3Key: a.string().required(),
      caption: a.string(),
      order: a.integer(),
      project: a.belongsTo("Project", "projectId"),
    })
    .authorization((allow) => [
      allow.authenticated().to(["create", "update", "delete"]),
      allow.guest().to(["read"]),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
