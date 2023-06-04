require("dotenv").config();
// @ts-ignore
import Twilio from "twilio";

const getWorkspaceId = async (client: any) => {
  const workspaces = await client.taskrouter.v1.workspaces.list({
    friendlyName: "Flex Task Assignment",
  });
  if (!workspaces.length) {
    return null;
  }
  return workspaces[0].sid;
};

const getDefaultTaskQueueId = async (workspaceSid: string, client: any) => {
  const taskQueues = await client.taskrouter.v1
    .workspaces(workspaceSid)
    .taskQueues.list({ friendlyName: "Everyone" });
  if (!taskQueues.length) {
    return null;
  }
  return taskQueues[0].sid;
};

const createWorkflowForWorkspace = async (
  workspaceSid: string,
  taskQueueSid: string,
  client: any,
  workflowName: string
) => {
  const workflow = await client.taskrouter.v1
    .workspaces(workspaceSid)
    .workflows.create({
      friendlyName: workflowName,
      configuration: JSON.stringify({
        task_routing: {
          filters: [
            {
              filter_friendly_name: "Default",
              expression: "1==1",
              targets: [
                {
                  queue: taskQueueSid,
                  known_worker_friendly_name: "task.agentId",
                },
              ],
            },
          ],
        },
      }),
    });
  return workflow.sid;
};

const getStudioFlowSid = async (client: any, studioFlowName: string) => {
  const flows = await client.studio.v1.flows.list();
  // @ts-ignore
  const studioFlow = flows.find(
    // @ts-ignore
    ({ friendlyName }) => friendlyName === studioFlowName
  );
  if (!studioFlow) {
    return null;
  }
  return studioFlow.sid;
};

const getCurrentFlowDefinition = async (flowSid: string, client: any) => {
  const flow = await client.studio.v2.flows(flowSid).fetch();
  return flow.definition;
};

const getUpdatedFlowDefinition = (
  flowDefinition: any,
  workflowSid: string,
  taskChannelSid: string
) => {
  return flowDefinition.map((definition: any) => {
    if (definition.name !== "send_to_flex_agent") {
      return definition;
    }
    return {
      ...definition,
      properties: {
        ...definition.properties,
        workflow: workflowSid,
        channel: taskChannelSid,
      },
    };
  });
};

const getTaskChannelSid = async (workspaceSid: string, client: any) => {
  // @ts-ignore
  const taskChannels = await client.taskrouter.v1
    .workspaces(workspaceSid)
    .taskChannels.list({ friendlyName: "Programmable Chat" });
  // @ts-ignore
  return taskChannels.find(({ uniqueName }) => uniqueName === "chat").sid;
};

const updateFlowDefinition = async (
  flowSid: string,
  updatedDefinition: any,
  client: any
) => {
  const updatedFlow = await client.studio.v2.flows(flowSid).update({
    commitMessage: "Update flow definition",
    definition: updatedDefinition,
    status: "published",
  });
  return updatedFlow.friendlyName;
};

export const createWorkflow = async ({
  accountSid,
  authToken,
  studioFlowName,
  workflowName,
}: {
  accountSid: string;
  authToken: string;
  studioFlowName: string;
  workflowName: string;
}) => {
  // @ts-ignore
  const client = new Twilio(accountSid, authToken);
  const workspaceSid = await getWorkspaceId(client);
  const taskQueueSid = await getDefaultTaskQueueId(workspaceSid, client);
  let workflowSid = "";
  const workflow = await client.taskrouter.v1
    .workspaces(workspaceSid)
    .workflows.list({ friendlyName: "Trasfer to Agent" });
  if (workflow.length) {
    workflowSid = workflow[0].sid;
  } else {
    workflowSid = await createWorkflowForWorkspace(
      workspaceSid,
      taskQueueSid,
      client,
      workflowName
    );
  }
  const taskChannelSid = await getTaskChannelSid(workspaceSid, client);
  const studioFlowSid = await getStudioFlowSid(client, studioFlowName);
  const flowDefinition = await getCurrentFlowDefinition(studioFlowSid, client);
  const updatedFlowDefinition = {
    ...flowDefinition,
    states: getUpdatedFlowDefinition(
      flowDefinition.states,
      workflowSid,
      taskChannelSid
    ),
  };
  const updatedFlow = await updateFlowDefinition(
    studioFlowSid,
    updatedFlowDefinition,
    client
  );
  console.log("Flow updated", updatedFlow);
  return updatedFlow;
};
