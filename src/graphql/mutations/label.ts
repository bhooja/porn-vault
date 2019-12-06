import * as database from "../../database";
import Actor from "../../types/actor";
import Label from "../../types/label";
import Scene from "../../types/scene";
import Image from "../../types/image";
import { Dictionary } from "../../types/utility";
import { tokenPerms } from "../../extractor";
import * as logger from "../../logger/index";

type ILabelUpdateOpts = Partial<{
  name: string;
  aliases: string[];
  thumbnail: string;
}>;

export default {
  async removeLabels(_, { ids }: { ids: string[] }) {
    for (const id of ids) {
      const label = await Label.getById(id);

      if (label) {
        await Label.remove(label._id);

        await Actor.filterLabel(label._id);
        await Scene.filterLabel(label._id);
        await Image.filterLabel(label._id);
      }
    }
    return true;
  },

  async addLabel(_, args: Dictionary<any>) {
    const label = new Label(args.name, args.aliases);

    for (const scene of await Scene.getAll()) {
      const perms = tokenPerms(scene.path || scene.name);

      if (
        perms.includes(label.name.toLowerCase()) ||
        label.aliases.some(alias => perms.includes(alias.toLowerCase()))
      ) {
        await database.update(
          database.store.scenes,
          { _id: scene._id },
          { $push: { labels: label._id } }
        );
        logger.log(`Updated labels of ${scene._id}`);
      }
    }

    await database.insert(database.store.labels, label);
    return label;
  },

  async updateLabels(
    _,
    { ids, opts }: { ids: string[]; opts: ILabelUpdateOpts }
  ) {
    const updatedLabels = [] as Label[];

    for (const id of ids) {
      const label = await Label.getById(id);

      if (label) {
        if (Array.isArray(opts.aliases))
          label.aliases = [...new Set(opts.aliases)];

        if (typeof opts.name == "string") label.name = opts.name.trim();

        if (typeof opts.thumbnail == "string") label.thumbnail = opts.thumbnail;

        await database.update(database.store.labels, { _id: label._id }, label);
        updatedLabels.push(label);
      } else {
        throw new Error(`Label ${id} not found`);
      }
    }

    return updatedLabels;
  }
};
