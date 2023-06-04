export const taskRouterData = `# Task Router with Flex  
  
  ## Routing agents based on agentId
  
  For routing to different agents we are using a parameter  **agentId**  which we recieve from the website when creating a new conversation.  This **agentId** is passed as an attibute to the Flex workflow which can be accessed under **task.agentId**.
  
  ###  Create a workflow
  
  1.  Select **Workflows** from the Flex Task Assignment menu:
  2. Create a new Workflow for the Task Assignment queue. Click **plus (‘+’)** at the top of the page to add a new Workflow.
  3. Enter **Transfer to Agent** as the **Workflow Name**.
  4. Now add a **Filter** to the Workflow. Set the filter name to ‘Agent Service’, and select ‘Agent Service’ as the **Queue**.
  
  ![[Pasted image 20220713164650.png]]
  
  5. Set Default Task Queue to  **None**.
  
  ### Assign workflow to studio flow.
  
  1. Update the **WORKFLOW** in send to flex widget to **Transfer to Agent**
  
  ![[Pasted image 20220713165152.png]]
  
  
  ### Creating Workflow using Node JS SDK.
  
  #### Get workspace Id
  
  Flex default workspace has a friendlyName as **Flex Task Assignment**. We can use this name to get the **workspace Id**
  
  const getWorkspaceId = async () => {
    const workspaces = await client.taskrouter.v1.workspaces.list({
      friendlyName: "Flex Task Assignment",
    });
  
    if (!workspaces.length) {
      return null;
    }
    return workspaces[0].sid;
  };
  
  #### Get task queue Id
  
  Flex default task queue is **Everyone** which has all the workers. We can use this to get the Task Queue Sid.
  
  const getDefaultTaskQueueId = async (workspaceSid) => {
    const taskQueues = await client.taskrouter.v1
      .workspaces(workspaceSid)
      .taskQueues.list({ friendlyName: "Everyone" });
  
    if (!taskQueues.length) {
      return null;
    }
    return taskQueues[0].sid;
  };
    
  
  #### Create workflow
  
  We can use the **Task Queue SID**  and **Workspace SID** to create the workflow.
  
  const createWorkflow = async (workspaceSid, taskQueueSid) => {
    const workflow = await 
    .client.taskrouter.v1.workspaces(workspaceSid).workflows.create({
      friendlyName: "Trasfer to Agent 2",
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
  }
  
  
  The workflow will be now created this workflow sid has to be assigned to the studio flow for routing.
  
  #### Helper script for creating workflow  and updating studio
  
  const Twilio = require("twilio");
  
  const ACCOUNT_SID = process.env["TWILIO_ACCOUNT_SID"];
  const AUTH_TOKEN = process.env["TWILIO_AUTH_TOKEN"];
  
  const client = new Twilio(ACCOUNT_SID, AUTH_TOKEN);
  
  const getWorkspaceId = async () => {
    const workspaces = await client.taskrouter.v1.workspaces.list({
      friendlyName: "Flex Task Assignment",
    });
    if (!workspaces.length) {
      return null;
    }
    return workspaces[0].sid;
  };
  
  const getDefaultTaskQueueId = async (workspaceSid) => {
    const taskQueues = await client.taskrouter.v1
      .workspaces(workspaceSid)
      .taskQueues.list({ friendlyName: "Everyone" });
    if (!taskQueues.length) {
      return null;
    }
    return taskQueues[0].sid;
  };
  
  const createWorkflowForWorkspace = async (workspaceSid, taskQueueSid) => {
    const workflow = await client.taskrouter.v1
      .workspaces(workspaceSid)
      .workflows.create({
        friendlyName: "Trasfer to Agent",
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
  
  const getStudioFlowSid = async () => {
    const flows = await client.studio.v1.flows.list();
    const studioFlow = flows.find(
      ({ friendlyName }) => friendlyName === "webchat-flow"
    );
    if (!studioFlow) {
      return null;
    }
    return studioFlow.sid;
  };
  
  const getCurrentFlowDefinition = async (flowSid) => {
    const flow = await client.studio.v2.flows(flowSid).fetch();
    return flow.definition;
  };
  
  const getUpdatedFlowDefinition = (flowDefinition, workflowSid) => {
    return flowDefinition.map((definition) => {
      if (definition.name !== "send_to_flex_agent") {
        return definition;
      }
      return {
        ...definition,
        properties: {
          ...definition.properties,
          workflow: workflowSid,
        },
      };
    });
  };
  
  const updateFlowDefinition = async (flowSid, updatedDefinition) => {
    const updatedFlow = await client.studio.v2
      .flows(flowSid)
      .update({
        commitMessage: "Update flow definition",
        definition: updatedDefinition,
        status: "published",
      });
    return updatedFlow.friendlyName;
  };
  
  const createWorkflow = async () => {
    const workspaceSid = await getWorkspaceId();
    const taskQueueSid = await getDefaultTaskQueueId(workspaceSid);
    const workflowSid = await createWorkflowForWorkspace(
      workspaceSid,
      taskQueueSid
    );
    const studioFlowSid = await getStudioFlowSid();
    const flowDefinition = await getCurrentFlowDefinition(studioFlowSid);
    const updatedFlowDefinition = {
      ...flowDefinition,
      states: getUpdatedFlowDefinition(flowDefinition.states, workflowSid),
    };
    const updatedFlow = await updateFlowDefinition(
      studioFlowSid,
      updatedFlowDefinition
    );
    console.log(updatedFlow);
  };
  
  createWorkflow();
  `;
