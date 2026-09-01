---
title: Template design
layout: page
parent: Development
nav_order: 1
---

# Template Design
Designing a template can be done in many ways and is made possible thanks to the `custom:button-card` intergration. Its difficult to explain everything in detail, but we can give a few guidelines to how you can create an internal template that suites the Marao Dashboard style.

## Building a project template
- Create the template YAML under `custom_components/marao_dashboard/frontend/dashboard/MaraoDashboard/templates/internal_templates`, based on our [naming convention](#naming-convention) like *hc_temperature_card*.
- Create a new `README.md` file where you describe your card like variables.
- Create a `.yaml` file with the same name as the template so in this case *hc_temperature_card.yaml*. This is important otherwise the template won't be included!
- Open the new file and start creating your template. We already defined a prefered structure for the file [here](#order).
- You can use an internal template already available to have a base. Just enter the desired template in the `template:` value. This is not mandatory as long as you follow our guidelines.
- To test your new card, add it to a view and *refresh* your dashboard. If everything went good, you should see your new card.
- When the template and its documentation are complete, run the static and
  frontend tests and open a [pull request](https://github.com/diogomrpr/MaraoDashboard/pulls).

## Naming convention
To make it easier to see which templates are custom and which are not, you have to use a certain naming convention.

The template name should describe the card and keep the existing `hc_..._card` pattern.

Eventually, it should look like this:
`hc_temperature_card.yaml`

and the folder structure like this:

```tree
templates/internal_templates
└── hc_temperature_card.yaml
```

## Order
To make everything easier to understand we use a structure for all our templates. You can leave parts out of it if not needed, but the structure has to be the same.

**Note:** Its important that the first line is the exact same name as the template. So in this case, the name would be `hc_temperature_card`.

```yaml
hc_temperature_card:
  template:
  variables:
  tap_action/hold action/...:
  triggers_update:
  show_icon:
  show_label:
  show_name:
  show_state:
  icon:
  label:
  name:
  state:
  entity:
  styles:
    icon:
    label:
    name:
    state:
    img_cell:
    grid:
    card:
  custom_fields:
    item1:
      card:
        type:
        template:

```
