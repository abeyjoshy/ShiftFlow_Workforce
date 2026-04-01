import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import serverless from 'serverless-http';

import { app } from './app';
import { connectDb } from './src/config/db';

const serverlessHandler = serverless(app);

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
) => {
  await connectDb();
  return serverlessHandler(event, context);
};