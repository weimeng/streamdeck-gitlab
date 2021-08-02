# StreamDeck-GitLab

StreamDeck-GitLab is a JavaScript plugin for the Elgato Stream Deck that lets
you view your GitLab assigned issues, assigned merge requests and pending to-do
counts in your Stream Deck.

## Features

* Counters for assigned issues, assigned merge requests, review-requested merge requests and pending to-dos.
* Button is highlighted when counters increase.
* Each button also opens its respective dashboard page.

## Requirements

* Combined merge requests count requires GitLab 13.8 or later.
* Assigned issues, review-requested merge requests and pending to-dos counts require GitLab 14.2 or later.

## Installation

1. Create a GitLab personal access token with `read_api` scope.
1. Download the `co.weimeng.streamdeck-gitlab.streamDeckPlugin` file, and
   double-click it.
1. Enter your GitLab URL (without trailing slash), username and personal access
   token in the Stream Deck key properties.
1. Done!

## Contributing

The main repository is located on GitLab.com at https://gitlab.com/weimeng/streamdeck-gitlab.

Issues should be reported in the [GitLab.com project issue tracker](https://gitlab.com/weimeng/streamdeck-gitlab/-/issues).
Code contributions are welcome.
