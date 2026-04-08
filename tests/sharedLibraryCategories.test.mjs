import assert from "node:assert/strict";
import {
  DEFAULT_SHARED_CATEGORY_SLUG,
  SHARED_LIBRARY_CATEGORIES,
  getSharedLibraryCategoryLabel,
  isSharedLibraryCategorySlug,
} from "../src/lib/sharedLibraryCategories.ts";

assert.equal(DEFAULT_SHARED_CATEGORY_SLUG, "uncategorized");
assert.equal(isSharedLibraryCategorySlug("data-analysis"), true);
assert.equal(isSharedLibraryCategorySlug("unknown"), false);
assert.equal(getSharedLibraryCategoryLabel("security-systems"), "Security & Systems");
assert.equal(SHARED_LIBRARY_CATEGORIES.at(-1)?.slug, "uncategorized");

console.log("sharedLibraryCategories test passed");
