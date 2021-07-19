import Random from "../resources/random";
import { OperationProcessor, Operation, OperationResult, ResourceOperationResult, JsonApiErrors } from "../kurier";

const randomDataGenerator = {
  number: () => ({ randomNumber: Math.random() }),
  string: () => ({ randomString: parseInt(Math.random().toString().split(".")[1]).toString(16) }),
  date: () => ({ randomDate: new Date(1602518929 + Math.random() * 10000000000000).toJSON() })
}

export default class RandomProcessor<ResourceT extends Random> extends OperationProcessor<ResourceT> {
  static resourceClass = Random;

  async get(op: Operation): Promise<OperationResult> {
    if (op.ref.id in randomDataGenerator) {
      const record =  {
        id: op.ref.id,
        ...randomDataGenerator[op.ref.id]()
      };

      return new ResourceOperationResult(record);
    } else {
      throw JsonApiErrors.BadRequest(`Allowed random data generators: ${Object.keys(randomDataGenerator).join(", ")}`);
    }
  }
}
