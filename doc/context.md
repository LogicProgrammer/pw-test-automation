# Api Styling

1. tests
2. page object entities
   1. page objects
   2. page functions
3. test-data
4. helpers - utilities & app functionalities
5. pipeline configuration
6. environment configuration
7. customized reporting

## execution flow

tests -> page object model -> playwright internals

# test

```typescript

test.describe('<group description',() => {})

test('<description>',async (<fixtures>) => {
    // test body with assertions
})

```

controllable items -> fixtures and test body
