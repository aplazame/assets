
Preview | Size | URL
------- | ---- | ---$each{ file in files }
[![](${ file.path })](${ file.path }) | `width: ${ file.dimensions.width }px`<br>`height: ${ file.dimensions.height }px` | [$cdn{ file }](${ file.path }){/}
