import { HasId } from "../../../../src";
import { KnexProcessor } from "../kurier";
import Link from "../resources/link";
import Vote from "../resources/vote";

export default class LinkProcessor<ResourceT extends Link> extends KnexProcessor<ResourceT> {
  static resourceClass = Link;

  meta = {
    async voteCount(this: LinkProcessor<Link>, article: HasId) {
      const processor = <KnexProcessor<Vote>>await this.processorFor("vote");

      const [result] = await processor
        .getQuery()
        .where({ [this.appInstance.app.serializer.relationshipToColumn('article')]: article.id })
        .count();

      return result["count(*)"];
    }
  };
}
