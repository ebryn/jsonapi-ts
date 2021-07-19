import Session from "../resources/session";
import KnexProcessor from "./knex-processor";
import { Operation, DEFAULT_PRIMARY_KEY, ResourceAttributes } from "../types";
import jsonApiErrors from "../errors/json-api-errors";
import { randomBytes } from "crypto";
import { sign } from "jsonwebtoken";
import Password from "../attribute-types/password";
import pick from "../utils/pick";
import { ResourceOperationResult } from "../operation-result";

export default class SessionProcessor<T extends Session> extends KnexProcessor<T> {
  public static resourceClass = Session;

  protected async login(op: Operation, userDataSource: ResourceAttributes) {
    console.warn(
      "WARNING: You're using the default login callback with UserManagementAddon." +
      "ANY LOGIN REQUEST WILL PASS. Implement this callback in your addon configuration."
    );
    return true;
  }

  public async add(op: Operation): Promise<ResourceOperationResult> {
    const fields = Object.keys(op.data?.attributes as { [key: string]: Function })
      .filter(attribute => this.resourceClass.schema.attributes[attribute] !== Password)
      .map(attribute => ({ [attribute]: op.data?.attributes[attribute] }))
      .reduce((attributes, attribute) => ({ ...attributes, ...attribute }), {});

    if (Object.keys(fields).length === 0) {
      throw jsonApiErrors.InvalidData();
    }

    const userType = this.resourceClass.schema.relationships.user.type();

    const user = await this.knex(this.appInstance.app.serializer.resourceTypeToTableName(userType.type))
      .where(fields)
      .first();

    if (!user) {
      throw jsonApiErrors.AccessDenied();
    }

    const isLoggedIn = await this.login(op, user);

    if (!isLoggedIn) {
      throw jsonApiErrors.AccessDenied();
    }

    const userId = user[userType.schema.primaryKeyName || DEFAULT_PRIMARY_KEY];
    const userAttributes = pick(
      user,
      Object.keys(userType.schema.attributes)
        .filter(attribute => userType.schema.attributes[attribute] !== Password)
        .map(attribute => this.appInstance.app.serializer.attributeToColumn(attribute))
    );

    const secureData = this.appInstance.app.serializer.serializeResource(
      {
        type: userType.type,
        id: userId,
        attributes: {
          ...userAttributes
        } as { [key: string]: Function },
        relationships: {}
      },
      userType,
      this.appInstance.app.serializer.linkBuilder.baseUrl
    );

    const token = sign(secureData, process.env.SESSION_KEY as string, {
      subject: String(userId),
      expiresIn: "1d"
    });

    const session = {
      token,
      [this.appInstance.app.serializer.relationshipToColumn(
        userType.type, userType.schema.primaryKeyName
      )]: userId,
      id: randomBytes(16).toString("hex")
    };

    return new ResourceOperationResult(session);
  }
}
