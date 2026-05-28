/**
 * Vercel Serverless Function: Global View Counter
 * Increments a GitHub Gist counter on each visit
 * 
 * Environment Variables Required:
 * - GITHUB_TOKEN: GitHub Personal Access Token with gist scope
 * - GIST_ID: The ID of your counter gist
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const GIST_ID = process.env.GIST_ID;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    if (!GIST_ID || !GITHUB_TOKEN) {
      return res.status(500).json({
        error: 'Missing environment variables: GIST_ID or GITHUB_TOKEN',
      });
    }

    // Fetch current gist content
    const gistResponse = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'GET',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!gistResponse.ok) {
      return res.status(gistResponse.status).json({
        error: 'Failed to fetch gist',
        details: await gistResponse.text(),
      });
    }

    const gist = await gistResponse.json();
    const counterFile = gist.files['counter.txt'];

    if (!counterFile) {
      return res.status(500).json({
        error: 'counter.txt file not found in gist',
      });
    }

    // Parse and increment counter
    let currentCount = parseInt(counterFile.content, 10) || 0;
    let newCount = currentCount + 1;

    // Update gist with new count
    const updateResponse = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          'counter.txt': {
            content: newCount.toString(),
          },
        },
      }),
    });

    if (!updateResponse.ok) {
      return res.status(updateResponse.status).json({
        error: 'Failed to update gist',
        details: await updateResponse.text(),
      });
    }

    // Return the new count
    return res.status(200).json({
      views: newCount,
      success: true,
    });
  } catch (error) {
    console.error('Error in view-counter:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
