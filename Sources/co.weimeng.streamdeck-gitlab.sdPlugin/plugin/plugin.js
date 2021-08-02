let fetchTimer, uuid,
    appearContexts = {},
    globalSettings = {
      'gitlabUrl': null,
      'gitlabUsername': null,
      'gitlabToken': null,
    },
    userCounts = {
      'assigned_issues': 0,
      'assigned_merge_requests': 0,
      'review_requested_merge_requests': 0,
      'todos': 0,
    };

$SD.on('connected', (event) => onConnected(event));
$SD.on('didReceiveGlobalSettings', (event) => onDidReceiveGlobalSettings(event));

function onConnected(event) {
  // Get global settings
  uuid = event.uuid;
  $SD.api.getGlobalSettings(uuid);

  // Assigned issues
  $SD.on('co.weimeng.streamdeck-gitlab.issues.willAppear', (event) => onIssuesWillAppear(event));
  $SD.on('co.weimeng.streamdeck-gitlab.issues.willDisappear', (event) => onIssuesWillDisappear(event));
  $SD.on('co.weimeng.streamdeck-gitlab.issues.keyDown', (event) => onIssuesKeyDown(event));
  $SD.on('co.weimeng.streamdeck-gitlab.issues.keyUp', (event) => onIssuesKeyUp(event));

  // Assigned merge requests
  $SD.on('co.weimeng.streamdeck-gitlab.mergerequests.willAppear', (event) => onMRsWillAppear(event));
  $SD.on('co.weimeng.streamdeck-gitlab.mergerequests.willDisappear', (event) => onMRsWillDisappear(event));
  $SD.on('co.weimeng.streamdeck-gitlab.mergerequests.keyDown', (event) => onMRsKeyDown(event));
  $SD.on('co.weimeng.streamdeck-gitlab.mergerequests.keyUp', (event) => onMRsKeyUp(event));

  // Pending Todos
  $SD.on('co.weimeng.streamdeck-gitlab.todos.willAppear', (event) => onTodosWillAppear(event));
  $SD.on('co.weimeng.streamdeck-gitlab.todos.willDisappear', (event) => onTodosWillDisappear(event));
  $SD.on('co.weimeng.streamdeck-gitlab.todos.keyDown', (event) => onTodosKeyDown(event));
  $SD.on('co.weimeng.streamdeck-gitlab.todos.keyUp', (event) => onTodosKeyUp(event));
}

function onDidReceiveGlobalSettings(event) {
  globalSettings = event.payload.settings;

  fetchGitlabUserCounts();
}

//
// Common functions
//

function onCommonWillAppear(event) {
  appearContexts[event.context] = 1;

  // Start polling GitLab API if not already started
  if (fetchTimer === undefined || fetchTimer === null) {
    fetchGitlabUserCounts();
    fetchTimer = setInterval(() => fetchGitlabUserCounts(), 60 * 1000);
  }
}

function onCommonWillDisappear(event) {
  delete appearContexts[event.context];

  // Stop polling GitLab API if all action instances are removed
  if (Object.keys(appearContexts).length < 1) {
    console.log('Unsetting fetchTimer');
    clearInterval(fetchTimer);
    fetchTimer = null;
  }
}

function fetchGitlabUserCounts() {
  if (globalSettings.gitlabUrl === null || globalSettings.gitlabUrl === '') return;
  if (globalSettings.gitlabToken === null || globalSettings.gitlabToken === '') return;

  console.log('Fetching user counts from GitLab API...');

  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('Authorization', `Bearer ${globalSettings.gitlabToken}`);

  var url = `${globalSettings.gitlabUrl}/api/v4/user_counts`;

  fetch(url, {
    method: 'GET',
    headers
  })
  .then(response => response.json())
  .then((out) => {
    console.log('Fetching user counts from GitLab API... Success!');
    userCounts = out;

    updateIssueCount();
    updateMRCount();
    updateTodoCount();
  })
  .catch((error) => {
    console.log(`Fetching user counts from GitLab API failed with error: ${error}`)
  });
}

//
// Merge Requests
//

let mrContext, mrCount;

function onMRsWillAppear(event) {
  mrContext = event.context;
  updateMRCount();
  onCommonWillAppear(event);
}

function onMRsWillDisappear(event) {
  onCommonWillDisappear(event);
}

function onMRsKeyDown(event) {
  $SD.api.openUrl(event.context, `${globalSettings.gitlabUrl}/dashboard/merge_requests?assignee_username=${globalSettings.gitlabUsername}`);
}

function onMRsKeyUp(event) {
  $SD.api.setState(event.context, 0);
}

function updateMRCount() {
  let mrTempCount = userCounts.assigned_merge_requests + userCounts.review_requested_merge_requests;

  if (mrTempCount !== undefined) {
    if (mrTempCount > mrCount) $SD.api.setState(mrContext, 1);

    $SD.api.setTitle(mrContext, mrTempCount);
  }

  mrCount = mrTempCount;
}

//
// Issues
//

let issueContext, issueCount;

function onIssuesWillAppear(event) {
  issueContext = event.context;
  updateIssueCount();
  onCommonWillAppear(event);
}

function onIssuesWillDisappear(event) {
  onCommonWillDisappear(event);
}

function onIssuesKeyDown(event) {
  $SD.api.openUrl(event.context, `${globalSettings.gitlabUrl}/dashboard/issues?assignee_username=${globalSettings.gitlabUsername}`);
}

function onIssuesKeyUp(event) {
  $SD.api.setState(event.context, 0);
}

function updateIssueCount() {
  let issueTempCount = userCounts.assigned_issues;

  if (issueTempCount !== undefined) {
    if (issueTempCount > issueCount) $SD.api.setState(issueContext, 1);

    $SD.api.setTitle(issueContext, issueTempCount);
  }

  issueCount = issueTempCount;
}

//
// Todos
///

let todoContext, todoCount;

function onTodosWillAppear(event) {
  todoContext = event.context;
  updateTodoCount();
  onCommonWillAppear(event);
}

function onTodosWillDisappear(event) {
  onCommonWillDisappear(event);
}

function onTodosKeyDown(event) {
  $SD.api.openUrl(event.context, `${globalSettings.gitlabUrl}/dashboard/todos`);
}

function onTodosKeyUp(event) {
  $SD.api.setState(event.context, 0);
}

function updateTodoCount() {
  let todoTempCount = userCounts.todos;

  if (todoTempCount !== undefined) {
    if (todoTempCount > todoCount) $SD.api.setState(todoContext, 1);

    $SD.api.setTitle(todoContext, todoTempCount);
  }

  todoCount = todoTempCount;
}
