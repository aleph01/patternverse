//! Presentation-only grouping of the compiler's validated forward control flow.
//! No condition is evaluated here; the runtime remains its sole interpreter.
use super::*;

pub(super) struct WorkbookFlow {
    successors: Vec<Vec<usize>>,
    after: Vec<usize>,
}

impl WorkbookFlow {
    /// Build postdominators from checked forward targets, bounded to 2,048 steps.
    ///
    /// # Errors
    /// Returns a diagnostic when the definition exceeds the workbook step limit.
    pub fn new(steps: &[(CheckedStep, Span)]) -> Result<Self, Vec<Diagnostic>> {
        if steps.len() > 2048 {
            return Err(vec![err("Workbook exceeds 2,048 steps", 0..0)]);
        }
        let exit = steps.len();
        let successors: Vec<_> = steps
            .iter()
            .enumerate()
            .map(|(i, (step, _))| match step {
                CheckedStep::End => vec![exit],
                CheckedStep::Jump(target) => vec![target.0],
                CheckedStep::Branch { arms, otherwise } => arms
                    .iter()
                    .map(|(_, target)| target.0)
                    .chain([otherwise.0])
                    .collect(),
                CheckedStep::Match {
                    cases,
                    otherwise,
                    has_fallback,
                    ..
                } => cases
                    .iter()
                    .map(|(_, target)| target.0)
                    .chain(has_fallback.then_some(otherwise.0))
                    .collect(),
                _ => vec![i + 1],
            })
            .collect();
        let mut result = Self {
            successors,
            after: vec![exit; exit + 1],
        };
        for i in (0..exit).rev() {
            result.after[i] = result.successors[i]
                .iter()
                .copied()
                .reduce(|a, b| result.common(a, b))
                .unwrap_or(exit);
        }
        Ok(result)
    }

    /// Find the immediate common continuation; terminal paths share the virtual exit.
    fn common(&self, mut a: usize, mut b: usize) -> usize {
        while a != b {
            if a < b {
                a = self.after[a];
            } else {
                b = self.after[b];
            }
        }
        a
    }

    /// Return the nearest node that follows every alternative at this checked step.
    pub fn continuation(&self, index: usize) -> usize {
        self.after[index]
    }

    /// Collect one alternative's reachable region without crossing its join or exit.
    fn region(&self, start: usize, join: usize) -> BTreeSet<usize> {
        let mut result = BTreeSet::new();
        let mut pending = vec![start];
        while let Some(index) = pending.pop() {
            if index == join || index == self.successors.len() || !result.insert(index) {
                continue;
            }
            pending.extend(self.successors[index].iter().copied());
        }
        result
    }

    /// Crossing alternatives cannot be flattened into independent workbook sections.
    pub fn independent(&self, targets: &[usize], join: usize) -> bool {
        let mut occupied = BTreeSet::new();
        for target in targets.iter().copied() {
            let region = self.region(target, join);
            if !occupied.is_disjoint(&region) {
                return false;
            }
            occupied.extend(region);
        }
        true
    }
}
