import {
  Breadcrumbs,
  Card,
  Group,
  MantineProvider,
  Menu,
  Stepper,
  Timeline,
} from '@octanejs/mantine-core';
import { useState } from 'octane';

export function CompiledChildren() @{
  const [active, setActive] = useState(1);

  <MantineProvider env="test">
    <Breadcrumbs id="breadcrumbs" separator="→">
      <a href="/one">One</a>
      <a href="/two">Two</a>
      <a href="/three">Three</a>
    </Breadcrumbs>

    <Card id="card">
      <Card.Section id="first-section">First</Card.Section>
      <div id="card-body">Body</div>
      <Card.Section id="last-section">Last</Card.Section>
    </Card>

    <Stepper id="stepper" active={active} onStepClick={setActive}>
      <Stepper.Step label="First" description="First description">
        <div id="first-step-content">First content</div>
      </Stepper.Step>
      <Stepper.Step label="Second" description="Second description">
        <div id="second-step-content">Second content</div>
      </Stepper.Step>
      <Stepper.Completed>Complete</Stepper.Completed>
    </Stepper>

    <Timeline id="timeline" active={1}>
      <Timeline.Item title="First event">First body</Timeline.Item>
      <Timeline.Item title="Second event" opposite="10:00">Second body</Timeline.Item>
    </Timeline>

    <Group id="group" grow>
      <button id="group-one">One</button>
      <button id="group-two">Two</button>
    </Group>

    <Menu withinPortal={false}>
      <Menu.Target>
        <button id="menu-target">Open menu</button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item id="menu-item">Action</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  </MantineProvider>
}
