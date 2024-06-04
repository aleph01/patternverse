import {defineField, defineType} from 'sanity';

export default defineType({
  name: 'collection',
  title: 'Collection',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    defineField({
      name: 'color',
      title: 'Color',
      type: 'string',
    }),
    defineField({
      name: 'patterns',
      title: 'Patterns',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: { type: 'pattern' },
        }
      ]
    })
  ]
})