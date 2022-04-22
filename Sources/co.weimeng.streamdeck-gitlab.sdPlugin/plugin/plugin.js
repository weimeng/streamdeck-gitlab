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
  $SD.on('co.weimeng.streamdeck-gitlab.issues.didReceiveSettings', (event) => onIssuesDidReceiveSettings(event));

  // Combined merge requests
  $SD.on('co.weimeng.streamdeck-gitlab.mergerequests.willAppear', (event) => onMRsWillAppear(event, 'combined'));
  $SD.on('co.weimeng.streamdeck-gitlab.mergerequests.willDisappear', (event) => onMRsWillDisappear(event, 'combined'));
  $SD.on('co.weimeng.streamdeck-gitlab.mergerequests.keyDown', (event) => onMRsKeyDown(event, 'combined'));
  $SD.on('co.weimeng.streamdeck-gitlab.mergerequests.keyUp', (event) => onMRsKeyUp(event, 'combined'));
  $SD.on('co.weimeng.streamdeck-gitlab.mergerequests.didReceiveSettings', (event) => onMRsDidReceiveSettings(event, 'combined'));

  // Assigned merge requests
  $SD.on('co.weimeng.streamdeck-gitlab.mr-assigns.willAppear', (event) => onMRsWillAppear(event, 'assigns'));
  $SD.on('co.weimeng.streamdeck-gitlab.mr-assigns.willDisappear', (event) => onMRsWillDisappear(event, 'assigns'));
  $SD.on('co.weimeng.streamdeck-gitlab.mr-assigns.keyDown', (event) => onMRsKeyDown(event, 'assigns'));
  $SD.on('co.weimeng.streamdeck-gitlab.mr-assigns.keyUp', (event) => onMRsKeyUp(event, 'assigns'));
  $SD.on('co.weimeng.streamdeck-gitlab.mr-assigns.didReceiveSettings', (event) => onMRsDidReceiveSettings(event, 'assigns'));

  // Combined merge requests
  $SD.on('co.weimeng.streamdeck-gitlab.mr-reviews.willAppear', (event) => onMRsWillAppear(event, 'reviews'));
  $SD.on('co.weimeng.streamdeck-gitlab.mr-reviews.willDisappear', (event) => onMRsWillDisappear(event, 'reviews'));
  $SD.on('co.weimeng.streamdeck-gitlab.mr-reviews.keyDown', (event) => onMRsKeyDown(event, 'reviews'));
  $SD.on('co.weimeng.streamdeck-gitlab.mr-reviews.keyUp', (event) => onMRsKeyUp(event, 'reviews'));
  $SD.on('co.weimeng.streamdeck-gitlab.mr-reviews.didReceiveSettings', (event) => onMRsDidReceiveSettings(event, 'reviews'));

  // Pending Todos
  $SD.on('co.weimeng.streamdeck-gitlab.todos.willAppear', (event) => onTodosWillAppear(event));
  $SD.on('co.weimeng.streamdeck-gitlab.todos.willDisappear', (event) => onTodosWillDisappear(event));
  $SD.on('co.weimeng.streamdeck-gitlab.todos.keyDown', (event) => onTodosKeyDown(event));
  $SD.on('co.weimeng.streamdeck-gitlab.todos.keyUp', (event) => onTodosKeyUp(event));
  $SD.on('co.weimeng.streamdeck-gitlab.todos.didReceiveSettings', (event) => onTodosDidReceiveSettings(event));
}

function onDidReceiveGlobalSettings(event) {
  globalSettings = event.payload.settings;
}

//
// Common functions
//

function onCommonDidReceiveSettings(event) {
  // Start polling GitLab API if not already started
  if (fetchTimer === undefined || fetchTimer === null) {
    fetchGitlabUserCounts();
    fetchTimer = setInterval(() => fetchGitlabUserCounts(), 60 * 1000);
  }
}

function onCommonWillAppear(event) {
  appearContexts[event.context] = 1;

  $SD.api.getSettings(event.context);
}

function onCommonWillDisappear(event) {
  delete appearContexts[event.context];

  // Stop polling GitLab API if all action instances are removed
  if (Object.keys(appearContexts).length < 1) {
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

    Object.keys(appearContexts).forEach(context => {
      $SD.api.setSettings(context, userCounts);
    });
  })
  .catch((error) => {
    console.log(`Fetching user counts from GitLab API failed with error: ${error}`)
  });
}

//
// Merge Requests
//

let mrContext = {},
    mrCount = {};

function onMRsWillAppear(event, mrType) {
  mrContext[mrType] = event.context;
  onCommonWillAppear(event);
}

function onMRsWillDisappear(event, _mrType) {
  onCommonWillDisappear(event);
}

function onMRsDidReceiveSettings(event, _mrType) {
  onCommonDidReceiveSettings(event);

  switch (_mrType) {
    case 'assigns':
      if (event.payload.settings.assigned_merge_requests !== undefined) {
        userCounts.assigned_merge_requests = event.payload.settings.assigned_merge_requests;
      }
      break;
    case 'reviews':
      if (event.payload.settings.review_requested_merge_requests !== undefined) {
        userCounts.review_requested_merge_requests = event.payload.settings.review_requested_merge_requests;
      }
      break;
    default:
      if (event.payload.settings.assigned_merge_requests !== undefined &&
        event.payload.settings.review_requested_merge_requests !== undefined) {
        userCounts.assigned_merge_requests = event.payload.settings.assigned_merge_requests;
        userCounts.review_requested_merge_requests = event.payload.settings.review_requested_merge_requests;
      }
      break;
  }

  updateMRTypeCount(_mrType);
}

function onMRsKeyDown(event, mrType) {
  let url = `${globalSettings.gitlabUrl}/dashboard/merge_requests`;

  if (mrType === 'reviews') {
    url += `?reviewer_username=${globalSettings.gitlabUsername}`;
  } else {
    url += `?assignee_username=${globalSettings.gitlabUsername}`;
  }

  $SD.api.openUrl(event.context, url);
}

function onMRsKeyUp(event, _mrType) {
  $SD.api.setState(event.context, 0);
}

function updateMRTypeCount(_mrType) {
  let mrTempCount = {
    'combined': userCounts.assigned_merge_requests + userCounts.review_requested_merge_requests,
    'assigns': userCounts.assigned_merge_requests,
    'reviews': userCounts.review_requested_merge_requests,
  };

  mrTypeTempCount = mrTempCount[_mrType];
  if (mrTypeTempCount !== undefined) {
    if (mrTypeTempCount > mrCount[_mrType]) $SD.api.setState(mrContext[_mrType], 1);

    $SD.api.setTitle(mrContext[_mrType], mrTypeTempCount);
  }

  mrCount[_mrType] = mrTypeTempCount;
}


function updateMRCount() {
  updateMRTypeCount('combined');
  updateMRTypeCount('assigns');
  updateMRTypeCount('reviews');
}

//
// Issues
//

let issueContext, issueCount;

function onIssuesWillAppear(event) {
  issueContext = event.context;
  onCommonWillAppear(event);
}

function onIssuesWillDisappear(event) {
  onCommonWillDisappear(event);
}

function onIssuesDidReceiveSettings(event) {
  onCommonDidReceiveSettings(event);

  if (event.payload.settings.assigned_issues !== undefined) {
    userCounts.assigned_issues = event.payload.settings.assigned_issues;
  }

  updateIssueCount();
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
  onCommonWillAppear(event);
}

function onTodosWillDisappear(event) {
  onCommonWillDisappear(event);
}

function onTodosDidReceiveSettings(event) {
  onCommonDidReceiveSettings(event);

  if (event.payload.settings.todos !== undefined) {
    userCounts.todos = event.payload.settings.todos;
  }

  updateTodoCount();
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
