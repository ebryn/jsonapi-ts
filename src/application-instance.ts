import { decode } from "jsonwebtoken";
import * as Knex from "knex";

import Application from "./application";
import Resource from "./resource";
import OperationProcessor from "./processors/operation-processor";
import { Operation } from "./types";
import jsonApiErrors from "./json-api-errors";
import User from "./resources/user";

export default class ApplicationInstance {
  public user: User;
  public transaction: Knex.Transaction;

  constructor(public app: Application) {}

  async processorFor(
    resourceType: string
  ): Promise<OperationProcessor<Resource> | undefined> {
    return this.app.processorFor(resourceType, this);
  }

  async getUserFromToken(token: string): Promise<User | undefined> {
    const tokenPayload = decode(token);

    if (!tokenPayload) {
      throw jsonApiErrors.InvalidToken();
    }

    const userId = tokenPayload["id"];

    if (!userId) return;

    const op = {
      op: "identify",
      ref: {
        type: "user",
        id: userId
      },
      params: {}
    } as Operation;

    const [user] = await this.app.executeOperations([op]);

    if (!user.data) {
      throw jsonApiErrors.InvalidToken();
    }

    return user.data[0];
  }
}
