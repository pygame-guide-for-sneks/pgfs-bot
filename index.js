/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  // Your code here
  app.log.info('Yay, the app was loaded!');

  async function get_reviews(context) {
    const {data: reviews} = await context.octokit.pulls.listReviews({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      pull_number: context.payload.pull_request.number,
    });

    return reviews.filter((review) => review.state === 'APPROVED').length;
  }

  async function labelExists(context, labelName) {
    const {data: labels} =
        await context.octokit.issues.listLabelsOnIssue(context.issue());
    return labels.some((label) => label.name === labelName);
  }

  app.on('pull_request.opened', async (context) => {
    return context.octokit.issues.addLabels(
        context.issue({labels: ['PR: Needs first approval']}));
  })

  app.on('pull_request_review.submitted', async (context) => {
    // does not work. Why?
    try {
      const count = await get_reviews(context);
      if (count == 1) {
        if (!await labelExists(context, 'PR: Needs second approval')) {
          context.octokit.issues.addLabels(
              context.issue({labels: ['PR: Needs second approval']}));
        }

        if (await labelExists(context, 'PR: Needs first approval')) {
          context.octokit.issues.removeLabel(
              context.issue({name: 'PR: Needs first approval'}));
        }

      } else if (count == 2) {
        if (!await labelExists(context, 'PR: Awaiting merge')) {
          context.octokit.issues.addLabels(
              context.issue({labels: ['PR: Awaiting merge']}));
        }

        if (await labelExists(context, 'PR: Needs second approval')) {
          context.octokit.issues.removeLabel(
              context.issue({name: 'PR: Needs second approval'}));
        }
      }
    } catch (error) {
      // handle error
      console.log(error);
    }
  });

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
