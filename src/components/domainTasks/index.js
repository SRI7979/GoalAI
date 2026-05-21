'use client'

import DomainTaskBase from './DomainTaskBase'

export function CodeSandbox(props) {
  return <DomainTaskBase {...props} taskType="CodeSandbox" />
}

export function StepByStepProblem(props) {
  return <DomainTaskBase {...props} taskType="StepByStepProblem" />
}

export function AIConversationRoleplay(props) {
  return <DomainTaskBase {...props} taskType="AIConversationRoleplay" />
}

export function SocraticDebate(props) {
  return <DomainTaskBase {...props} taskType="SocraticDebate" />
}

export function AdversarialDebate(props) {
  return <DomainTaskBase {...props} taskType="AdversarialDebate" />
}

export function RubricFeedback(props) {
  return <DomainTaskBase {...props} taskType="RubricFeedback" />
}

export function DiagramAnalysis(props) {
  return <DomainTaskBase {...props} taskType="DiagramAnalysis" />
}

export default DomainTaskBase
