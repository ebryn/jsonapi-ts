import Authorize from "../decorators/authorize";
import { Operation } from "../types";
import User from "../resources/user";
import KnexProcessor from "./knex-processor";
import Password from "../attribute-types/password";
import Resource from "../resource";
import { OperationResult } from "../types";
import { ResourceOperationResult } from "../operation-result";

export default class UserProcessor<T extends User> extends KnexProcessor<T> {
  public static resourceClass = User;

  async identify(op: Operation): Promise<OperationResult> {
    return super.get({ ...op, params: {} });
  }

  protected async generateId(): Promise<any> {}
  protected async encryptPassword(op: Operation): Promise<any> {
    throw new Error("You must implement a password encryption mechanism.");
  }

  async add(op: Operation): Promise<ResourceOperationResult> {
    const fields = Object.keys(op.data?.attributes as { [key: string]: Function })
      .filter(attribute => this.resourceClass.schema.attributes[attribute] !== Password)
      .map(attribute => ({ [attribute]: op.data?.attributes[attribute] }))
      .reduce((attributes, attribute) => ({ ...attributes, ...attribute }), {});

    const id = await this.generateId();

    const encryptedPassword = await this.encryptPassword(op);

    return super.add({
      ...op,
      data: {
        ...op.data,
        id,
        attributes: {
          ...fields,
          ...encryptedPassword
        }
      } as Resource
    });
  }

  @Authorize()
  async get(op: Operation): Promise<OperationResult> {
    return super.get(op);
  }
}
