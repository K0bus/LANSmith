import { defineEventHandler, getRouterParam, getQuery, createError } from 'h3';
import { prisma } from '../../utils/prisma';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const query = getQuery(event);
  const type = (typeof query.type === 'string' ? query.type.toLowerCase() : 'gpu') as
    | 'gpu'
    | 'cpu';

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID manquant' });
  }

  if (type === 'gpu') {
    await prisma.benchmarkGpu.delete({
      where: { id }
    });
  } else {
    await prisma.benchmarkCpu.delete({
      where: { id }
    });
  }

  return { success: true, id, type };
});
