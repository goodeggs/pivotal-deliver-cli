#!/usr/bin/env node

/*
 script to mark pivotal stories as Delivered,
 using a commit range.
*/

"use strict";

// using fibrous for more CLI-friendly flow.
var fibrous = require('fibrous');

var child_process = require('child_process');

// this uses old v3 of API (latest is v5), but should be sufficient. (v3 docs are confusing/incomplete.)
var Pivotal = require('pivotal');

function getEnv(key, desc) {
  var val = process.env[key];
  if (val == null || !val.length) throw new Error("Missing " + desc);
  return val;
}

function exec(cmd, callback) {
  child_process.exec(cmd, {}, function(err, stdout, stderr) {
    if (err) {
      err = "Error code " + err.code + ": " + err.message;
      return callback(err);
    }
    stderr = stderr.trim();
    stdout = stdout.trim();
    if (stderr.length) return callback(new Error("Error: " + stderr));
    return callback(null, stdout);
  });
}

fibrous.run(function() {
  var pivotalToken = getEnv('PIVOTAL_TOKEN', 'Pivotal API token');
  var pivotalProjectId = getEnv('PIVOTAL_PROJECT_ID', 'Pivotal project ID');
  var currentBuildCommit = getEnv('CURRENT_COMMIT', 'current build commit');
  var previousBuildCommit = getEnv('PREVIOUS_COMMIT', 'previous build commit');

  console.log("Parsing stories to deliver in commit range " +
    previousBuildCommit + ".." + currentBuildCommit + " ...");

  var logLines = exec.sync("git log --format=full " + previousBuildCommit + ".." + currentBuildCommit)
    .split(require('os').EOL);

  var parsedStoryIds = [], line, matches, match, storyId;

  for (var lineInd = 0; lineInd < logLines.length; lineInd++) {
    line = logLines[lineInd];
    if (/^(Author|Commit|Merge): /.test(line)) continue;
    if (/^commit [0-9a-f]{40}$/.test(line)) continue;
    if (line.trim().length === 0) continue;

    // current stories are 8 digits long, but assuming they're just ints and can get longer...?
    matches = line.match(/#[0-9]{8,12}/g);
    if (matches) {
      for (var matchInd = 0; matchInd < matches.length; matchInd++) {
        match = matches[matchInd];
        storyId = match.replace(/^#(.*)/, '$1');
        if (!(parsedStoryIds.indexOf(storyId) >= 0)) parsedStoryIds.push(storyId);
      }
    }
  }
  console.log("Parsed story IDs:", parsedStoryIds.join(' '));

  //Pivotal.debug = true;
  var pivotal = new Pivotal;
  var storiesRes, stories = [], story;

  pivotal.useToken(pivotalToken);

  storiesRes = pivotal.sync.getStories(pivotalProjectId, {
    filter: 'state:finished story_type:feature,bug,chore',
    limit: 300
  });

  if (storiesRes) stories = storiesRes.story || [];

  stories = stories.filter (function(story) {
    return parsedStoryIds.indexOf(story.id) >= 0;
  });

  if (stories.length === 0) {
    console.log("No matching finished stories found.");
    process.exit();
  }
  console.log("Matching finished stories:\n" +
    stories.map(function(story){ return "- " + story.id + ": " + story.name + "\n"; })
  );

  for (var storyInd = 0; storyInd < stories.length; storyInd++) {
    story = stories[storyInd];
    pivotal.sync.addStoryComment(pivotalProjectId, story.id, "Auto-delivered via deploy script.");
    pivotal.sync.updateStory(pivotalProjectId, story.id, { current_state: 'delivered' });
    console.log("Delivered " + story.id);
  }
});
