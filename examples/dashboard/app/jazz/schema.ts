import { Account, CoList, CoMap, Profile, co } from "jazz-tools";

// final goals is to make fancy dashboard to see/search across all covalue jazz values of jazz 'app'
// without dealing with jazz lingo, just a dashboard

// for now it,s todo app adapted from examples/todo
// to mess around with inspector more

// task that collaborators can tick or rename
export class Task extends CoMap {
  done = co.boolean;
  text = co.string;
}

export class ListOfTasks extends CoList.Of(co.ref(Task)) {}

// top level object with title, referencing list of tasks
export class TodoProject extends CoMap {
  title = co.string;
  tasks = co.ref(ListOfTasks);
}

export class ListOfProjects extends CoList.Of(co.ref(TodoProject)) {}

// account root is an app-specific per-user private CoMap where you can store top-level objects for that user
export class TodoAccountRoot extends CoMap {
  projects = co.ref(ListOfProjects);
}

export class TodoAccount extends Account {
  profile = co.ref(Profile);
  root = co.ref(TodoAccountRoot);

  // Account migration is run on account creation and on every log-in.
  // You can use it to set up the account root and any other initial CoValues you need.
  migrate() {
    if (!this._refs.root) {
      this.root = TodoAccountRoot.create(
        {
          projects: ListOfProjects.create([], { owner: this }),
        },
        { owner: this },
      );
    }
  }
}
