// Role profiles: weighted keyword lanes scored against a posting's title and
// qualifications. These are plain data so the UI can edit them and so adding a
// lane never means touching the scoring engine.
//
// Terms are matched on word boundaries, not raw substrings (see lib/match.js),
// so 'java' does not fire on JavaScript. A trailing '*' makes a term a prefix
// stem: 'containeriz*' covers containerize and containerization.
//
// Every weight is adjustable in the UI — a user with a different background
// turns the lanes they don't want down to zero, and the onboarding flow sets
// them automatically from an uploaded resume.

export const ROLE_PROFILES = [
  {
    id: 'infrastructure',
    label: 'Cloud & Infrastructure',
    weight: 1,
    signals: [
      { points: 10, terms: ['aws', 'infrastructure as code', 'terraform', 'cloudformation', 'cdk', 'cloud infrastructure'] },
      { points: 8, terms: ['kubernetes', 'docker', 'ci/cd', 'devops', 'site reliability', 'sre', 'containeriz*'] },
      { points: 5, terms: ['lambda', 's3', 'api gateway', 'cloudfront', 'route 53', 'serverless', 'linux', 'azure', 'gcp'] },
    ],
  },
  {
    id: 'backend',
    label: 'Backend & Distributed Systems',
    weight: 1,
    signals: [
      { points: 10, terms: ['backend', 'back-end', 'distributed systems', 'microservices', 'rest api', 'restful'] },
      { points: 8, terms: ['python', 'flask', 'django', 'fastapi', 'node.js', 'go', 'golang', 'java'] },
      { points: 5, terms: ['sql', 'postgres', 'database', 'authentication', 'jwt', 'api design', 'grpc', 'kafka'] },
    ],
  },
  {
    id: 'fullstack',
    label: 'Full-Stack & Frontend',
    weight: 1,
    signals: [
      { points: 10, terms: ['full stack', 'full-stack', 'fullstack'] },
      { points: 8, terms: ['react', 'typescript', 'javascript', 'next.js', 'graphql', 'frontend', 'front-end'] },
      { points: 5, terms: ['html', 'css', 'scss', 'sass', 'tailwind', 'web application', 'ui development', 'gatsby'] },
    ],
  },
  {
    id: 'systems',
    label: 'Systems & Performance',
    weight: 1,
    signals: [
      { points: 10, terms: ['c++', 'systems programming', 'low-level', 'low level', 'operating system', 'compiler', 'kernel'] },
      { points: 8, terms: ['performance optimization', 'concurrency', 'parallel*', 'multithread*', 'simd', 'avx', 'intrinsics', 'vectoriz*', 'memory management', 'rust'] },
      { points: 5, terms: ['algorithms', 'data structures', 'embedded', 'firmware', 'profiling', 'latency', 'throughput', 'cache', 'prefetch*', 'race condition*', 'lock-free', 'cuda', 'openmp', 'assembly'] },
    ],
  },
  {
    id: 'data',
    label: 'Data Engineering',
    weight: 0.5,
    signals: [
      { points: 10, terms: ['data engineer', 'data pipeline', 'etl', 'data warehouse'] },
      { points: 6, terms: ['spark', 'airflow', 'snowflake', 'dbt', 'bigquery', 'redshift'] },
      { points: 4, terms: ['analytics', 'data modeling', 'pandas'] },
    ],
  },
  {
    id: 'ml',
    label: 'Machine Learning',
    weight: 0.2,
    signals: [
      { points: 10, terms: ['machine learning', 'deep learning', 'llm', 'nlp', 'computer vision'] },
      { points: 6, terms: ['pytorch', 'tensorflow', 'scikit*', 'model training', 'mlops'] },
      { points: 4, terms: ['ai engineer', 'data science', 'neural network'] },
    ],
  },
];

/** Keeps a keyword-stuffed posting from swamping a genuinely well-matched one. */
export const MAX_POINTS_PER_PROFILE = 30;

/** Fraction of the second-best lane's score that counts, rewarding breadth. */
export const SECONDARY_LANE_FACTOR = 0.3;
