import { resolve } from "path";
import { readFile, writeFile, pathExists } from "fs-extra";
import ora from "ora";
import chalk from "chalk";
import { prompt, Question } from "inquirer";
import create from "../functions/create";
import subscribe from "../functions/subscribe";
import { errorLogger } from "../utils";
import { EventEmitter } from "events";
import { Options } from "../functions/create/types";

export default async (name: string, { typescript, useCwd }) => {
  const options: Options = {};

  if (!name) {
    const questions: Question[] = [
      {
        name: "name",
        type: "input",
        message: "Enter a name for the project:",
        default: "my-frontity-project"
      },
      {
        name: "theme",
        type: "input",
        message: "Enter a starter theme to clone:",
        default: "@frontity/mars-theme"
      }
    ];

    const answers = await prompt(questions);
    options.name = answers.name;
    options.packages = answers.packages;
    options.theme = answers.theme;
    console.log();
  } else {
    options.name = name;
  }

  options.typescript = typescript;
  options.path = useCwd ? process.cwd() : resolve(process.cwd(), options.name);

  const emitter = new EventEmitter();

  emitter.on("error", errorLogger);
  emitter.on("create", (message, action) => {
    if (action) ora.promise(action, message);
    else console.log(message);
  });

  await create(options, emitter);

  let shouldSubscribe: boolean = true;
  let frontityCache: { subscribed?: boolean } = {};

  const frontityCachePath = resolve(__dirname, "../../.frontity");
  const frontityCacheExists = await pathExists(frontityCachePath);

  if (frontityCacheExists) {
    frontityCache = JSON.parse(await readFile(frontityCachePath, "utf8"));
    shouldSubscribe = !frontityCache.subscribed;
  }

  if (shouldSubscribe) {
    const subscribeQuestions: Question[] = [
      {
        name: "subscribe",
        type: "confirm",
        message: "Do you want to receive framework updates by email?",
        default: false
      },
      {
        name: "email",
        type: "input",
        message: "Please, enter your email:",
        when: answers => answers.subscribe
      }
    ];
    const answers = await prompt(subscribeQuestions);

    if (answers.subscribe) {
      console.log();

      emitter.on("subscribe", (message, action) => {
        if (action) ora.promise(action, message);
        else console.log(message);
      });

      await subscribe(answers.email, emitter);

      console.log("\nThanks for subscribing! 😃\n");

      frontityCache.subscribed = true;
      await writeFile(
        frontityCachePath,
        JSON.stringify(frontityCache, null, 2)
      );
    } else {
      console.log(
        `\nOk, that's fine! 😉\nYou can subscribe at any point with ${chalk.bold.green(
          "frontity subscribe <email>"
        )}.\n`
      );
    }
  }

  console.log(
    `You can find docs at ${chalk.underline.magenta(
      "https://docs.frontity.org/"
    )}.\nYou can also be part of our community at ${chalk.underline.magenta(
      "https://community.frontity.org/"
    )}.\n`
  );
};
