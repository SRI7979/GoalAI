import UIDevtoolPage from '../page'
import { CS_PYTHON_DEVTOOL_PROMPT } from '@/lib/uiDevtoolCourses'

export default function CSPythonUIDevtoolPage() {
  return (
    <UIDevtoolPage
      lockedDomain="CS_CODING"
      promptOverride={CS_PYTHON_DEVTOOL_PROMPT}
      devtoolTitle="CS Devtool"
      headerLabel="Python course lab"
    />
  )
}
