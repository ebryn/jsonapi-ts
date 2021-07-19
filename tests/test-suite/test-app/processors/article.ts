import { KnexProcessor, HasId } from "../kurier";
import Article from "../resources/article";
import Vote from "../resources/vote";

export default class ArticleProcessor<ResourceT extends Article> extends KnexProcessor<ResourceT> {
  static resourceClass = Article;

  attributes = {
    async voteCount(this: ArticleProcessor<Article>, article: HasId) {
      const processor = <KnexProcessor<Vote>>await this.processorFor("vote");

      const [result] = await processor
        .getQuery()
        .where({ [this.appInstance.app.serializer.relationshipToColumn('article')]: article.id })
        .count();

      return result["count(*)"];
    }
  };

  // relationships = {
  //   async author(this: ArticleProcessor<Article>, article: HasId) {
  //     const processor = await this.processorFor("user");

  //     const result = await (processor as KnexProcessor)
  //       .getQuery()
  //       .where({ id: article.authorId })
  //       .select();

  //     return result;
  //   }
  // };
}
