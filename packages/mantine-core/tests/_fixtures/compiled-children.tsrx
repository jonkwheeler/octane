import {
  Breadcrumbs,
  Card,
  MantineProvider,
} from '@octanejs/mantine-core';

export function CompiledChildren() @{
  <MantineProvider>
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
  </MantineProvider>
}
