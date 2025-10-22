"""
Adaptive Code Generator

Generates code adapted to user's coding style and patterns.
"""

from typing import Dict, List, Optional
import json


class AdaptiveCodeGenerator:
    """
    Generates code based on learned user patterns and preferences.
    """

    def __init__(self):
        # Code templates by intent
        self.templates = {
            'data_processing': self.generate_data_processing,
            'data_loading': self.generate_data_loading,
            'data_analysis': self.generate_data_analysis,
            'api_request': self.generate_api_request,
            'api_post': self.generate_api_post,
            'file_creation': self.generate_file_creation,
            'file_manipulation': self.generate_file_manipulation,
            'code_generation': self.generate_function,
            'testing': self.generate_test,
            'debugging': self.generate_debug_code,
        }

        # User preferences (learned over time)
        self.user_preferences = {
            'imports_style': 'grouped',  # 'grouped' or 'inline'
            'preferred_libs': ['pandas', 'requests', 'asyncio'],
            'naming_convention': 'snake_case',
            'add_type_hints': True,
            'add_docstrings': True,
            'error_handling': 'try_except',  # 'try_except' or 'if_check'
        }

    def generate(
        self,
        intent: str,
        context: Dict,
        patterns: Optional[Dict] = None
    ) -> str:
        """
        Generate code based on intent and learned patterns.

        Args:
            intent: User intent (e.g., 'data_processing')
            context: Context info (file paths, data descriptions, etc.)
            patterns: Learned user patterns

        Returns:
            Generated Python code as string
        """
        # Get template function for this intent
        template_func = self.templates.get(intent)

        if not template_func:
            return f"# No template for intent: {intent}\n# Context: {context}"

        # Generate code using template
        code = template_func(context, patterns)

        # Apply user style preferences
        code = self.apply_style_preferences(code, patterns)

        return code

    def generate_data_processing(self, context: Dict, patterns: Optional[Dict]) -> str:
        """Generate data processing pipeline."""

        file_path = context.get('file_path', 'data.csv')
        operations = context.get('operations', ['clean', 'transform'])

        code = f"""import pandas as pd
from typing import Optional

def process_data(file_path: str = "{file_path}") -> pd.DataFrame:
    \"\"\"
    Process data file with cleaning and transformation.

    Based on your typical workflow:
    - Load data
    - Remove nulls
    - Clean values
    - Transform as needed
    \"\"\"
    # Load data
    df = pd.read_csv(file_path)
    print(f"Loaded {{len(df)}} rows")

    # Remove nulls (you always do this first)
    df = df.dropna()

"""

        if 'clean' in operations:
            code += """    # Clean data
    df = df[df['value'] > 0]  # Remove invalid values
    df['column'] = df['column'].str.strip()  # Clean strings

"""

        if 'transform' in operations:
            code += """    # Transform data
    df['date'] = pd.to_datetime(df['date'])
    df['processed_at'] = pd.Timestamp.now()

"""

        code += """    print(f"Processed {{len(df)}} rows")
    return df

# Execute
if __name__ == "__main__":
    df = process_data()
    print(df.head())
"""

        return code

    def generate_data_loading(self, context: Dict, patterns: Optional[Dict]) -> str:
        """Generate data loading code."""

        file_path = context.get('file_path', 'data.csv')
        file_type = context.get('file_type', 'csv')

        loaders = {
            'csv': 'pd.read_csv',
            'json': 'pd.read_json',
            'excel': 'pd.read_excel',
            'parquet': 'pd.read_parquet'
        }

        loader = loaders.get(file_type, 'pd.read_csv')

        code = f"""import pandas as pd

def load_data(file_path: str = "{file_path}") -> pd.DataFrame:
    \"\"\"Load data from {file_type} file.\"\"\"
    try:
        df = {loader}(file_path)
        print(f"Loaded {{len(df)}} rows, {{len(df.columns)}} columns")
        print(f"Columns: {{list(df.columns)}}")
        return df
    except Exception as e:
        print(f"Error loading data: {{e}}")
        raise

# Load data
df = load_data()
print(df.head())
"""

        return code

    def generate_data_analysis(self, context: Dict, patterns: Optional[Dict]) -> str:
        """Generate data analysis code."""

        code = """import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

def analyze_data(df: pd.DataFrame) -> None:
    \"\"\"Comprehensive data analysis.\"\"\"

    # Summary statistics
    print("=" * 50)
    print("DATA SUMMARY")
    print("=" * 50)
    print(df.describe())
    print()

    # Missing values
    print("Missing Values:")
    print(df.isnull().sum())
    print()

    # Correlations (numeric columns only)
    numeric_cols = df.select_dtypes(include=['number']).columns
    if len(numeric_cols) > 1:
        print("Correlations:")
        print(df[numeric_cols].corr())

        # Correlation heatmap
        plt.figure(figsize=(10, 8))
        sns.heatmap(df[numeric_cols].corr(), annot=True, cmap='coolwarm')
        plt.title('Correlation Matrix')
        plt.tight_layout()
        plt.savefig('correlation_matrix.png')
        print("Saved correlation_matrix.png")

    # Distribution plots
    for col in numeric_cols:
        plt.figure()
        df[col].hist(bins=30)
        plt.title(f'Distribution of {col}')
        plt.xlabel(col)
        plt.ylabel('Frequency')
        plt.savefig(f'{col}_distribution.png')

    print(f"Analysis complete. Generated {len(numeric_cols)} distribution plots.")

# Run analysis
analyze_data(df)
"""

        return code

    def generate_api_request(self, context: Dict, patterns: Optional[Dict]) -> str:
        """Generate API request code."""

        url = context.get('url', 'https://api.example.com/data')
        method = context.get('method', 'GET')
        auth = context.get('auth', False)

        code = f"""import requests
from typing import Dict, Optional
import json

def make_api_request(
    url: str = "{url}",
    params: Optional[Dict] = None,
    headers: Optional[Dict] = None
) -> Dict:
    \"\"\"
    Make API request with error handling.
    \"\"\"
"""

        if auth:
            code += """    # Add authentication (adjust as needed)
    if not headers:
        headers = {}
    headers['Authorization'] = 'Bearer YOUR_API_KEY'

"""

        code += """    try:
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()

        data = response.json()
        print(f"Success! Got {{len(data)}} items")
        return data

    except requests.exceptions.RequestException as e:
        print(f"API request failed: {{e}}")
        raise
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON: {{e}}")
        raise

# Make request
data = make_api_request()
print(json.dumps(data, indent=2))
"""

        return code

    def generate_api_post(self, context: Dict, patterns: Optional[Dict]) -> str:
        """Generate API POST request code."""

        url = context.get('url', 'https://api.example.com/data')

        code = f"""import requests
import json
from typing import Dict

def post_data(url: str = "{url}", data: Dict = None) -> Dict:
    \"\"\"POST data to API endpoint.\"\"\"

    if data is None:
        data = {{
            "key": "value",
            # Add your data here
        }}

    headers = {{
        'Content-Type': 'application/json',
        # 'Authorization': 'Bearer YOUR_API_KEY'  # Uncomment if needed
    }}

    try:
        response = requests.post(
            url,
            json=data,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()

        result = response.json()
        print(f"Success! Response: {{result}}")
        return result

    except requests.exceptions.RequestException as e:
        print(f"POST failed: {{e}}")
        raise

# Send data
result = post_data()
"""

        return code

    def generate_file_creation(self, context: Dict, patterns: Optional[Dict]) -> str:
        """Generate file creation code."""

        filename = context.get('filename', 'output.txt')
        content_type = context.get('content_type', 'text')

        if content_type == 'json':
            code = f"""import json

def save_json(data: dict, filename: str = "{filename}"):
    \"\"\"Save data to JSON file.\"\"\"
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Saved to {{filename}}")

# Example data
data = {{
    "key": "value",
    "items": [1, 2, 3]
}}

save_json(data)
"""
        else:
            code = f"""def save_file(content: str, filename: str = "{filename}"):
    \"\"\"Save content to file.\"\"\"
    with open(filename, 'w') as f:
        f.write(content)
    print(f"Saved to {{filename}}")

# Save file
content = "Your content here"
save_file(content)
"""

        return code

    def generate_file_manipulation(self, context: Dict, patterns: Optional[Dict]) -> str:
        """Generate file manipulation code."""

        code = """import shutil
from pathlib import Path

def copy_file(src: str, dest: str):
    \"\"\"Copy file from src to dest.\"\"\"
    shutil.copy2(src, dest)
    print(f"Copied {src} to {dest}")

def move_file(src: str, dest: str):
    \"\"\"Move file from src to dest.\"\"\"
    shutil.move(src, dest)
    print(f"Moved {src} to {dest}")

def delete_file(path: str):
    \"\"\"Delete file safely.\"\"\"
    file_path = Path(path)
    if file_path.exists():
        file_path.unlink()
        print(f"Deleted {path}")
    else:
        print(f"File not found: {path}")

# Example usage
# copy_file('source.txt', 'destination.txt')
# move_file('old.txt', 'new.txt')
# delete_file('temp.txt')
"""

        return code

    def generate_function(self, context: Dict, patterns: Optional[Dict]) -> str:
        """Generate generic function template."""

        func_name = context.get('function_name', 'my_function')
        description = context.get('description', 'Function description')

        code = f"""def {func_name}(param1, param2=None):
    \"\"\"
    {description}

    Args:
        param1: First parameter
        param2: Optional second parameter

    Returns:
        Result value
    \"\"\"
    # Implementation
    result = param1

    if param2 is not None:
        result += param2

    return result

# Test
if __name__ == "__main__":
    result = {func_name}(10, 20)
    print(f"Result: {{result}}")
"""

        return code

    def generate_test(self, context: Dict, patterns: Optional[Dict]) -> str:
        """Generate test code."""

        func_name = context.get('function_name', 'my_function')

        code = f"""import pytest

def test_{func_name}():
    \"\"\"Test {func_name} with various inputs.\"\"\"

    # Test basic functionality
    result = {func_name}(10, 20)
    assert result == 30, "Basic addition failed"

    # Test edge cases
    result = {func_name}(0)
    assert result == 0, "Zero input failed"

    # Test with None
    result = {func_name}(10, None)
    assert result == 10, "None parameter failed"

    print("All tests passed!")

if __name__ == "__main__":
    test_{func_name}()
"""

        return code

    def generate_debug_code(self, context: Dict, patterns: Optional[Dict]) -> str:
        """Generate debugging helpers."""

        code = """import traceback
import sys
from typing import Any

def debug_print(var_name: str, value: Any):
    \"\"\"Debug print with type information.\"\"\"
    print(f"{var_name} = {value}")
    print(f"Type: {type(value)}")
    if hasattr(value, '__len__'):
        print(f"Length: {len(value)}")
    print()

def safe_execute(func, *args, **kwargs):
    \"\"\"Execute function with detailed error reporting.\"\"\"
    try:
        result = func(*args, **kwargs)
        print(f"✓ {func.__name__} executed successfully")
        return result
    except Exception as e:
        print(f"✗ {func.__name__} failed:")
        print(f"  Error: {e}")
        print(f"  Type: {type(e).__name__}")
        print(f"  Args: {args}")
        print(f"  Kwargs: {kwargs}")
        print("\\nTraceback:")
        traceback.print_exc()
        return None

# Debug helpers ready to use
"""

        return code

    def apply_style_preferences(self, code: str, patterns: Optional[Dict]) -> str:
        """Apply user's coding style preferences."""

        # This is where you'd apply learned style preferences
        # For now, just return as-is
        return code

    def learn_style(self, user_code: str) -> None:
        """Learn user's coding style from their code."""

        # Analyze user's code to learn preferences
        # - Import style
        # - Naming conventions
        # - Comment style
        # - Error handling patterns
        # etc.

        pass  # To be implemented with ML
