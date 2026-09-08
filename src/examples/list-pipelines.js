const { getHubSpotDealPipelines } = require('../services/hubSpotService');
const { runExample } = require('./_run');

runExample('getHubSpotDealPipelines', async () => {
  const payload = await getHubSpotDealPipelines();
  const pipelines = payload.results || payload || [];
  return pipelines.map((pipeline) => ({
    id: pipeline.id,
    label: pipeline.label,
    default: Boolean(pipeline.default),
    stages: (pipeline.stages || []).map((stage) => ({
      id: stage.id,
      label: stage.label,
    })),
  }));
});
