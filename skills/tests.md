# Skill: Tests — Test coverage and quality

Check the diff for the following issues:

- **New public functions without tests** — exported functions or methods added in the diff that have no corresponding test file changes
- **Tests with no assertions** — test bodies that call functions but never assert anything (`expect`, `assert`, `should`)
- **Happy-path-only tests** — tests that only cover the success case and skip error, edge, or boundary conditions
- **Hardcoded test data that should be parameterised** — copy-pasted test cases that differ only in input values (use `it.each` / `@pytest.mark.parametrize`)
- **Mocks that never assert** — mocks set up with `jest.fn()` or `sinon.stub()` but never checked with `expect(mock).toHaveBeenCalledWith(...)`
- **Tests asserting implementation details** — tests that check internal state or private methods instead of observable behaviour
- **Missing error case tests** — functions that `throw` or return error states with no test covering those paths
- **Brittle assertions** — `expect(result).toEqual(bigWholeObject)` where a targeted assertion would be clearer and less fragile
- **Skipped or commented-out tests** — `it.skip`, `xit`, `xdescribe`, or `test.todo` left without explanation
